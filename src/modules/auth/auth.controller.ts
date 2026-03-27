import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { AuthGuard } from '@nestjs/passport';
import { FastifyRequest } from 'fastify';
import { AuthService } from './auth.service';
import { EmailVerificationService } from './email-verification.service';
import { RegisterLocalDto } from './dto/register-local.dto';
import { ShopSetupDto } from './dto/shop-setup.dto';
import { JwtAuthGuard } from 'src/common/guards';
import { GoogleUser } from './strategies/google.strategy';
import { PreRegisterDto, VerifyEmailDto } from './dto/pre-register.dto';

interface FastifyRequestWithUser extends FastifyRequest {
  user: { userId: string; username: string; role: string; shopId: string };
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly emailVerificationService: EmailVerificationService,
  ) {}

  // ============================================================
  // ĐĂNG KÝ LOCAL - BƯỚC 1: Gửi OTP xác thực email
  // POST /api/auth/pre-register
  // Rate limit: 10 request/phút/IP
  // ============================================================
  @Post('pre-register')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  async preRegister(@Body() dto: PreRegisterDto) {
    return this.emailVerificationService.preRegister(dto);
  }

  // ============================================================
  // ĐĂNG KÝ LOCAL - BƯỚC 2: Xác thực OTP email → nhận verifiedToken
  // POST /api/auth/verify-email
  // Rate limit: 10 request/phút/IP
  // ============================================================
  @Post('verify-email')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.emailVerificationService.verifyEmail(dto);
  }

  // ============================================================
  // ĐĂNG KÝ LOCAL - BƯỚC 3: Đăng ký tài khoản (cần verifiedToken)
  // POST /api/auth/register
  // Rate limit: 10 request/phút/IP
  // ============================================================
  @Post('register')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  async registerLocal(@Body() dto: RegisterLocalDto) {
    return this.authService.registerLocal(dto);
  }

  // ============================================================
  // ĐĂNG NHẬP LOCAL
  // GET /api/auth/login/:username/:password
  // Rate limit: 20 request/phút/IP
  // ============================================================
  @Get('login/:username/:password')
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  async loginLocal(
    @Param('username') username: string,
    @Param('password') password: string,
  ) {
    return this.authService.loginLocal(username, password);
  }

  // ============================================================
  // GOOGLE OAUTH
  // ============================================================
  @Get('google/register')
  @SkipThrottle()
  @UseGuards(AuthGuard('google-register'))
  googleRegister() {}

  @Get('google/register/callback')
  @SkipThrottle()
  @UseGuards(AuthGuard('google-register'))
  async googleRegisterCallback(@Req() req: FastifyRequest & { user?: GoogleUser }) {
    return this.authService.registerGoogle(req.user! as GoogleUser);
  }

  @Get('google/login')
  @SkipThrottle()
  @UseGuards(AuthGuard('google-login'))
  googleLogin() {}

  @Get('google/login/callback')
  @SkipThrottle()
  @UseGuards(AuthGuard('google-login'))
  async googleLoginCallback(@Req() req: FastifyRequest & { user?: GoogleUser }) {
    return this.authService.loginGoogle(req.user! as GoogleUser);
  }

  @Post('google/token')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  async googleToken(
    @Body('idToken') idToken: string,
    @Body('mode') mode: 'login' | 'register',
  ) {
    return this.authService.googleWithToken(idToken, mode);
  }

  // ============================================================
  // SETUP SHOP (sau đăng ký)
  // POST /api/auth/shop/setup
  // Yêu cầu JWT token
  // ============================================================
  @Post('shop/setup')
  @UseGuards(JwtAuthGuard)
  async setupShop(
    @Req() req: FastifyRequestWithUser,
    @Body() dto: ShopSetupDto,
  ) {
    return this.authService.setupShop(req.user.userId, dto);
  }

  // ============================================================
  // ĐỔI MẬT KHẨU - BƯỚC 1: Gửi OTP xác nhận
  // POST /api/auth/send-otp-change-password
  // Rate limit: 5 request/phút
  // ============================================================
  @Post('send-otp-change-password')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  async sendOtpChangePassword(
    @Body('username') username: string,
    @Body('email') email: string,
  ) {
    return this.authService.sendOtpChangePassword(username, email);
  }

  // ============================================================
  // ĐỔI MẬT KHẨU - BƯỚC 2: Xác nhận OTP + đổi mật khẩu
  // POST /api/auth/change-password
  // Rate limit: 5 request/phút
  // ============================================================
  @Post('change-password')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  async changePassword(
    @Body('username') username: string,
    @Body('email') email: string,
    @Body('otpCode') otpCode: string,
    @Body('oldPassword') oldPassword: string,
    @Body('newPassword') newPassword: string,
  ) {
    return this.authService.changePassword(username, email, otpCode, oldPassword, newPassword);
  }

  // ============================================================
  // QUÊN MẬT KHẨU - BƯỚC 1: Gửi OTP
  // POST /api/auth/forgot-password/send-otp
  // Nhận username hoặc email, tìm user và gửi OTP về email
  // Rate limit: 5 request/phút
  // ============================================================
  @Post('forgot-password/send-otp')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  async sendOtpForgotPassword(
    @Body('usernameOrEmail') usernameOrEmail: string,
  ) {
    return this.authService.sendOtpForgotPassword(usernameOrEmail);
  }

  // ============================================================
  // QUÊN MẬT KHẨU - BƯỚC 2: Xác thực OTP
  // POST /api/auth/forgot-password/verify-otp
  // Kiểm tra OTP có đúng không, nếu đúng cho qua bước 3
  // Rate limit: 5 request/phút
  // ============================================================
  @Post('forgot-password/verify-otp')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  async verifyOtpForgotPassword(
    @Body('username') username: string,
    @Body('email') email: string,
    @Body('otpCode') otpCode: string,
  ) {
    return this.authService.verifyOtpForgotPassword(username, email, otpCode);
  }

  // ============================================================
  // QUÊN MẬT KHẨU - BƯỚC 3: Đặt lại mật khẩu
  // POST /api/auth/forgot-password
  // Xác thực OTP + cập nhật mật khẩu mới vào DB
  // Rate limit: 5 request/phút
  // ============================================================
  @Post('forgot-password')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  async forgotPassword(
    @Body('username') username: string,
    @Body('email') email: string,
    @Body('otpCode') otpCode: string,
    @Body('newPassword') newPassword: string,
  ) {
    return this.authService.forgotPassword(username, email, otpCode, newPassword);
  }

  // ============================================================
  // ĐỔI MẬT KHẨU TRỰC TIẾP - BƯỚC 1: Xác minh mật khẩu cũ
  // POST /api/auth/verify-old-password
  // Rate limit: 5 request/phút
  // ============================================================
  @Post('verify-old-password')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  async verifyOldPassword(
    @Body('username') username: string,
    @Body('oldPassword') oldPassword: string,
  ) {
    return this.authService.verifyOldPassword(username, oldPassword);
  }

  // ============================================================
  // ĐỔI MẬT KHẨU TRỰC TIẾP - BƯỚC 2: Đổi mật khẩu
  // POST /api/auth/change-password-direct
  // Rate limit: 5 request/phút
  // ============================================================
  @Post('change-password-direct')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  async changePasswordDirect(
    @Body('username') username: string,
    @Body('oldPassword') oldPassword: string,
    @Body('newPassword') newPassword: string,
  ) {
    return this.authService.changePasswordDirect(username, oldPassword, newPassword);
  }
}
