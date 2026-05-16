import {
  Injectable,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';

import { User, UserDocument } from '../users/schemas/users.schema';
import { Otp, OtpDocument } from './schemas/otp.schema';
import { EmailService } from './email.service';
import { PreRegisterDto, VerifyEmailDto } from './dto/pre-register.dto';

const OTP_EXPIRE_MINUTES = 5;
const MAX_OTP_ATTEMPTS = 5;
const VERIFIED_TOKEN_EXPIRE_MINUTES = 30; // Sau khi verify email, có 30p để hoàn tất đăng ký

@Injectable()
export class EmailVerificationService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(Otp.name)
    private readonly otpModel: Model<OtpDocument>,
    private readonly emailService: EmailService,
    private readonly jwtService: JwtService,
  ) {}

  // ============================================================
  // BƯỚC 1: Gửi OTP xác thực email
  // POST /api/auth/pre-register
  // Body: { email }
  // Rate limit: 10 request/phút/IP
  // ============================================================
  async preRegister(dto: PreRegisterDto): Promise<Record<string, unknown>> {
    // Kiểm tra email đã tồn tại chưa
    const existingEmail = await this.userModel
      .findOne({ email: dto.email })
      .lean()
      .exec();

    if (existingEmail) {
      throw new ConflictException('Email này đã được đăng ký. Vui lòng đăng nhập hoặc dùng email khác.');
    }

    // Kiểm tra username đã tồn tại chưa
    const existingUsername = await this.userModel
      .findOne({ username: dto.username })
      .lean()
      .exec();

    if (existingUsername) {
      throw new ConflictException('Username này đã tồn tại. Vui lòng chọn username khác.');
    }

    // Xóa OTP cũ chưa dùng
    await this.otpModel.deleteMany({
      email: dto.email,
      isUsed: false,
      purpose: 'register',  // Phân biệt với OTP quên mật khẩu
    });

    // Tạo OTP 6 số
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + OTP_EXPIRE_MINUTES * 60 * 1000);

    await this.otpModel.create({
      _id: `otp_${randomUUID()}`,
      email: dto.email,
      otpCode,
      expiresAt,
      isUsed: false,
      attempts: 0,
      purpose: 'register',
    });

    // Gửi OTP qua email
    const sent = await this.emailService.sendRegisterOtp(dto.email, otpCode);
    if (!sent) {
      throw new InternalServerErrorException('Lỗi gửi email. Vui lòng thử lại');
    }

    return {
      success: true,
      message: `Mã OTP xác thực đã gửi tới ${dto.email}. Có hiệu lực ${OTP_EXPIRE_MINUTES} phút`,
    };
  }

  // ============================================================
  // BƯỚC 2: Xác thực OTP → trả verifiedToken
  // POST /api/auth/verify-email
  // Body: { email, otpCode }
  // ============================================================
  async verifyEmail(dto: VerifyEmailDto): Promise<Record<string, unknown>> {
    const otp = await this.otpModel
      .findOne({ email: dto.email, isUsed: false, purpose: 'register' })
      .sort({ createdAt: -1 })
      .exec();

    if (!otp) {
      throw new BadRequestException('OTP không hợp lệ hoặc đã hết hạn');
    }

    // Kiểm tra hết hạn
    if (new Date() > otp.expiresAt) {
      await this.otpModel.findByIdAndDelete(otp._id);
      throw new BadRequestException('OTP đã hết hạn. Vui lòng yêu cầu mã mới');
    }

    // Kiểm tra số lần nhập sai
    if (otp.attempts >= MAX_OTP_ATTEMPTS) {
      await this.otpModel.findByIdAndDelete(otp._id);
      throw new BadRequestException(
        'Nhập sai quá nhiều lần. Vui lòng yêu cầu OTP mới',
      );
    }

    // Kiểm tra OTP đúng không
    if (otp.otpCode !== dto.otpCode) {
      await this.otpModel.findByIdAndUpdate(otp._id, {
        $inc: { attempts: 1 },
      });
      const remaining = MAX_OTP_ATTEMPTS - otp.attempts - 1;
      throw new BadRequestException(`OTP không đúng. Còn ${remaining} lần thử`);
    }

    // Đánh dấu đã dùng
    await this.otpModel.findByIdAndUpdate(otp._id, { isUsed: true });

    // Tạo verifiedToken - bằng chứng email đã xác thực
    const verifiedToken = this.jwtService.sign(
      {
        email: dto.email,
        purpose: 'email_verified',
      },
      { expiresIn: `${VERIFIED_TOKEN_EXPIRE_MINUTES}m` },
    );

    return {
      success: true,
      message: 'Xác thực email thành công',
      verifiedToken, // Dùng token này ở bước register
      expiresIn: `${VERIFIED_TOKEN_EXPIRE_MINUTES} phút`,
    };
  }

  // ============================================================
  // DIAGNOSTIC: Test Gmail Email Configuration
  // GET /api/auth/email/test
  // ============================================================
  async testEmailConfiguration(): Promise<Record<string, unknown>> {
    const gmailUser = process.env.GMAIL_USER;
    const gmailPassword = process.env.GMAIL_APP_PASSWORD;

    // Check if credentials are set
    if (!gmailUser || !gmailPassword) {
      return {
        success: false,
        status: 'MISSING_CREDENTIALS',
        message: 'Gmail credentials not configured in .env file',
        details: {
          GMAIL_USER: gmailUser ? '✓ Set' : '✗ Missing',
          GMAIL_APP_PASSWORD: gmailPassword ? '✓ Set' : '✗ Missing',
        },
        troubleshooting: [
          'Add GMAIL_USER and GMAIL_APP_PASSWORD to .env file',
          'See GMAIL_SETUP.md for detailed instructions',
        ],
      };
    }

    // Check credentials format
    if (gmailPassword.length !== 16 || gmailPassword.includes(' ')) {
      return {
        success: false,
        status: 'INVALID_APP_PASSWORD_FORMAT',
        message: 'GMAIL_APP_PASSWORD format is invalid',
        details: {
          expectedLength: 16,
          actualLength: gmailPassword.length,
          hasSpaces: gmailPassword.includes(' '),
        },
        troubleshooting: [
          'App password should be exactly 16 characters without spaces',
          'Generate a new app password from Google Account settings',
          'See GMAIL_SETUP.md for detailed instructions',
        ],
      };
    }

    // Verify the connection using email service
    const isConnected = await this.emailService.verifyConnection();

    if (isConnected) {
      return {
        success: true,
        status: 'CONNECTED',
        message: '✅ Gmail SMTP connection verified successfully',
        details: {
          email: gmailUser,
          status: 'Connected and ready to send emails',
        },
      };
    } else {
      return {
        success: false,
        status: 'CONNECTION_FAILED',
        message: '❌ Failed to verify Gmail SMTP connection',
        details: {
          email: gmailUser,
          status: 'Connection verification failed',
        },
        troubleshooting: [
          'Check your internet connection',
          'Verify GMAIL_USER and GMAIL_APP_PASSWORD are correct',
          'Ensure 2-factor authentication is enabled on Gmail account',
          'Verify app password is generated and not yet expired',
          'Check Google Account security settings',
          'See GMAIL_SETUP.md for detailed instructions',
        ],
      };
    }
  }
}
