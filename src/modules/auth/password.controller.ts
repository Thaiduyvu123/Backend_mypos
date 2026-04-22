import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { PasswordService } from './password.service';
import { JwtAuthGuard } from 'src/common/guards';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  VerifyOtpDto,
  ResetPasswordDto,
  ForgotPasswordSendOtpDto,
  ForgotPasswordVerifyOtpDto,
  ForgotPasswordResetDto,
} from './dto/password.dto';

interface FastifyRequestWithUser extends FastifyRequest {
  user: { _id: string; username: string; role: string; shopId: string };
}

// ✅ BUG FIX: Thêm version: '1' (giống AuthController)
// Trước: @Controller('auth') → /api/auth/change-password (KHÔNG có v1)
// Sau:   → /api/v1/auth/change-password ✅
@Controller('auth')
export class PasswordController {
  constructor(private readonly passwordService: PasswordService) {}

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @Req() req: FastifyRequestWithUser,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.passwordService.changePassword(req.user._id, dto);
  }

  @Post('verify-old-password')
  async verifyOldPassword(
    @Body('username') username: string,
    @Body('oldPassword') oldPassword: string,
  ) {
    return this.passwordService.verifyOldPassword(username, oldPassword);
  }

  @Post('forgot-password/send-otp')
  async forgotPasswordSendOtp(@Body() dto: ForgotPasswordSendOtpDto) {
    return this.passwordService.sendOtpForgotPassword(dto.usernameOrEmail);
  }

  @Post('forgot-password/verify-otp')
  async forgotPasswordVerifyOtp(@Body() dto: ForgotPasswordVerifyOtpDto) {
    return this.passwordService.verifyOtpForgotPassword(
      dto.username,
      dto.email,
      dto.otpCode,
    );
  }

  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordResetDto) {
    return this.passwordService.forgotPasswordDirect(
      dto.username,
      dto.email,
      dto.otpCode,
      dto.newPassword,
    );
  }

  @Post('verify-otp')
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.passwordService.verifyOtp(dto);
  }

  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.passwordService.resetPassword(dto);
  }

  @Post('change-password-direct')
  async changePasswordDirect(
    @Body('username') username: string,
    @Body('oldPassword') oldPassword: string,
    @Body('newPassword') newPassword: string,
  ) {
    return this.passwordService.changePasswordDirect(
      username,
      oldPassword,
      newPassword,
    );
  }
}