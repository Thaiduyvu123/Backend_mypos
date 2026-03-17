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
    const existingUser = await this.userModel
      .findOne({ email: dto.email })
      .lean()
      .exec();

    if (existingUser) {
      throw new ConflictException(
        'Email này đã được đăng ký. Vui lòng đăng nhập.',
      );
    }

    // Xóa OTP cũ chưa dùng
    await this.otpModel.deleteMany({
      email: dto.email,
      isUsed: false,
      purpose: 'register', // Phân biệt với OTP quên mật khẩu
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
}
