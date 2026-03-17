import {
  Injectable,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';

import { User, UserDocument } from '../users/schemas/users.schema';
import { Otp, OtpDocument } from './schemas/otp.schema';
import { EmailService } from './email.service';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  VerifyOtpDto,
  ResetPasswordDto,
} from './dto/password.dto';

const OTP_EXPIRE_MINUTES = 5;
const MAX_OTP_ATTEMPTS = 5;
const RESET_TOKEN_EXPIRE_MINUTES = 10;

@Injectable()
export class PasswordService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(Otp.name)
    private readonly otpModel: Model<OtpDocument>,
    private readonly emailService: EmailService,
    private readonly jwtService: JwtService,
  ) {}

  // ============================================================
  // ĐỔI MẬT KHẨU (đã đăng nhập)
  // POST /api/auth/change-password
  // Header: Bearer token
  // ============================================================
  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
  ): Promise<Record<string, unknown>> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) throw new NotFoundException('Không tìm thấy user');

    // Kiểm tra provider - Google user không có password
    if (user.provider !== 'local') {
      throw new BadRequestException(
        'Tài khoản Google không thể đổi mật khẩu theo cách này',
      );
    }

    if (!user.passwordHash) {
      throw new BadRequestException('Tài khoản không có mật khẩu');
    }

    // Kiểm tra mật khẩu cũ
    const isMatch: boolean = await bcrypt.compare(
      dto.oldPassword,
      user.passwordHash,
    );
    if (!isMatch) {
      throw new UnauthorizedException('Mật khẩu cũ không đúng');
    }

    // Kiểm tra mật khẩu mới không trùng cũ
    const isSame: boolean = await bcrypt.compare(
      dto.newPassword,
      user.passwordHash,
    );
    if (isSame) {
      throw new BadRequestException(
        'Mật khẩu mới không được trùng mật khẩu cũ',
      );
    }

    // Hash và lưu mật khẩu mới
    const newHash: string = await bcrypt.hash(dto.newPassword, 10);
    await this.userModel.findByIdAndUpdate(userId, { passwordHash: newHash });

    return {
      success: true,
      message: 'Đổi mật khẩu thành công',
    };
  }

  // ============================================================
  // QUÊN MẬT KHẨU - Bước 1: Gửi OTP
  // POST /api/auth/forgot-password
  // Body: { email }
  // ============================================================
  async forgotPassword(
    dto: ForgotPasswordDto,
  ): Promise<Record<string, unknown>> {
    const user = await this.userModel.findOne({ email: dto.email }).exec();

    // Không tiết lộ email có tồn tại hay không (bảo mật)
    if (!user) {
      return {
        success: true,
        message: 'Nếu email tồn tại, mã OTP đã được gửi',
      };
    }

    if (user.provider !== 'local') {
      return {
        success: false,
        message: 'Tài khoản này đăng nhập bằng Google, không cần mật khẩu',
      };
    }

    // Xóa OTP cũ chưa dùng của email này
    await this.otpModel.deleteMany({ email: dto.email, isUsed: false });

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
    });

    // Gửi email
    const sent = await this.emailService.sendOtp(dto.email, otpCode);
    if (!sent) {
      throw new InternalServerErrorException('Lỗi gửi email. Vui lòng thử lại');
    }

    return {
      success: true,
      message: `Mã OTP đã được gửi tới ${dto.email}. Có hiệu lực trong ${OTP_EXPIRE_MINUTES} phút`,
    };
  }

  // ============================================================
  // QUÊN MẬT KHẨU - Bước 2: Xác thực OTP
  // POST /api/auth/verify-otp
  // Body: { email, otpCode }
  // ============================================================
  async verifyOtp(dto: VerifyOtpDto): Promise<Record<string, unknown>> {
    const otp = await this.otpModel
      .findOne({ email: dto.email, isUsed: false })
      .sort({ createdAt: -1 }) // Lấy OTP mới nhất
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
        'Đã nhập sai quá nhiều lần. Vui lòng yêu cầu mã OTP mới',
      );
    }

    // Kiểm tra OTP có đúng không
    if (otp.otpCode !== dto.otpCode) {
      await this.otpModel.findByIdAndUpdate(otp._id, {
        $inc: { attempts: 1 },
      });
      const remaining = MAX_OTP_ATTEMPTS - otp.attempts - 1;
      throw new BadRequestException(`OTP không đúng. Còn ${remaining} lần thử`);
    }

    // Đánh dấu OTP đã dùng
    await this.otpModel.findByIdAndUpdate(otp._id, { isUsed: true });

    // Tạo reset token (JWT ngắn hạn)
    const resetToken = this.jwtService.sign(
      { email: dto.email, purpose: 'reset_password' },
      { expiresIn: `${RESET_TOKEN_EXPIRE_MINUTES}m` },
    );

    return {
      success: true,
      message: 'Xác thực OTP thành công',
      resetToken, // Dùng token này để đặt lại mật khẩu
      expiresIn: `${RESET_TOKEN_EXPIRE_MINUTES} phút`,
    };
  }

  // ============================================================
  // QUÊN MẬT KHẨU - Bước 3: Đặt lại mật khẩu
  // POST /api/auth/reset-password
  // Body: { resetToken, newPassword }
  // ============================================================
  async resetPassword(dto: ResetPasswordDto): Promise<Record<string, unknown>> {
    // Verify reset token
    let payload: { email: string; purpose: string };
    try {
      payload = this.jwtService.verify<{ email: string; purpose: string }>(
        dto.resetToken,
      );
    } catch {
      throw new BadRequestException('Reset token không hợp lệ hoặc đã hết hạn');
    }

    if (payload.purpose !== 'reset_password') {
      throw new BadRequestException('Token không hợp lệ');
    }

    const user = await this.userModel.findOne({ email: payload.email }).exec();
    if (!user) throw new NotFoundException('Không tìm thấy tài khoản');

    // Hash mật khẩu mới
    const newHash: string = await bcrypt.hash(dto.newPassword, 10);
    await this.userModel.findByIdAndUpdate(user._id, {
      passwordHash: newHash,
    });

    return {
      success: true,
      message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại',
    };
  }
}
