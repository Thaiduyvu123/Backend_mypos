import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { PasswordService } from './password.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  VerifyOtpDto,
  ResetPasswordDto,
} from './dto/password.dto';

interface RequestWithUser extends Request {
  user: { userId: string; username: string; role: string; shopId: string };
}

@Controller('auth')
export class PasswordController {
  constructor(private readonly passwordService: PasswordService) {}

  // ============================================================
  // POST /api/auth/change-password
  // Đổi mật khẩu (đã đăng nhập)
  // Header: Authorization: Bearer <token>
  // Body: { oldPassword, newPassword }
  // ============================================================
  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @Req() req: RequestWithUser,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.passwordService.changePassword(req.user.userId, dto);
  }

  // ============================================================
  // POST /api/auth/forgot-password
  // Gửi OTP qua email
  // Body: { email }
  // ============================================================
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.passwordService.forgotPassword(dto);
  }

  // ============================================================
  // POST /api/auth/verify-otp
  // Xác thực OTP → nhận resetToken
  // Body: { email, otpCode }
  // ============================================================
  @Post('verify-otp')
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.passwordService.verifyOtp(dto);
  }

  // ============================================================
  // POST /api/auth/reset-password
  // Đặt lại mật khẩu bằng resetToken
  // Body: { resetToken, newPassword }
  // ============================================================
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.passwordService.resetPassword(dto);
  }
}
