import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import { FastifyRequest } from 'fastify'; // ✅ Dùng FastifyRequest
import { PasswordService } from './password.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  VerifyOtpDto,
  ResetPasswordDto,
} from './dto/password.dto';

interface FastifyRequestWithUser extends FastifyRequest {
  user: { userId: string; username: string; role: string; shopId: string };
}

@Controller('auth')
export class PasswordController {
  constructor(private readonly passwordService: PasswordService) {}

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @Req() req: FastifyRequestWithUser,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.passwordService.changePassword(req.user.userId, dto);
  }

  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.passwordService.forgotPassword(dto);
  }

  @Post('verify-otp')
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.passwordService.verifyOtp(dto);
  }

  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.passwordService.resetPassword(dto);
  }
}
