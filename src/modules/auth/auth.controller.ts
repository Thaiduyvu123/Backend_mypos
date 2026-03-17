// Thêm vào auth.controller.ts — các decorator @Throttle cho endpoint nhạy cảm

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
import { Request } from 'express';
import { AuthService } from './auth.service';
import { EmailVerificationService } from './email-verification.service';
import { RegisterLocalDto } from './dto/register-local.dto';
import { ShopSetupDto } from './dto/shop-setup.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleUser } from './strategies/google.strategy';
import { PreRegisterDto, VerifyEmailDto } from './dto/pre-register.dto';

interface RequestWithUser extends Request {
  user: { userId: string; username: string; role: string; shopId: string };
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly emailVerificationService: EmailVerificationService,
  ) {}

  // ============================================================
  // BƯỚC 1: Gửi OTP xác thực email
  // POST /api/auth/pre-register
  // Rate limit: 10 request/phút/IP (chặt hơn mặc định)
  // ============================================================
  @Post('pre-register')
  @Throttle({ default: { ttl: 60000, limit: 10 } }) // ✅ 10 req/phút
  async preRegister(@Body() dto: PreRegisterDto) {
    return this.emailVerificationService.preRegister(dto);
  }

  // ============================================================
  // BƯỚC 2: Xác thực OTP email → nhận verifiedToken
  // POST /api/auth/verify-email
  // ============================================================
  @Post('verify-email')
  @Throttle({ default: { ttl: 60000, limit: 10 } }) // ✅ 10 req/phút
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.emailVerificationService.verifyEmail(dto);
  }

  // ============================================================
  // BƯỚC 3: Đăng ký (cần verifiedToken)
  // POST /api/auth/register
  // ============================================================
  @Post('register')
  @Throttle({ default: { ttl: 60000, limit: 10 } }) // ✅ 10 req/phút
  async registerLocal(@Body() dto: RegisterLocalDto) {
    return this.authService.registerLocal(dto);
  }

  // ============================================================
  // ĐĂNG NHẬP LOCAL
  // GET /api/auth/login/:username/:password
  // ============================================================
  @Get('login/:username/:password')
  @Throttle({ default: { ttl: 60000, limit: 20 } }) // ✅ 20 req/phút
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
  @SkipThrottle() // Google tự xử lý rate limit
  @UseGuards(AuthGuard('google-register'))
  googleRegister() {}

  @Get('google/register/callback')
  @SkipThrottle()
  @UseGuards(AuthGuard('google-register'))
  async googleRegisterCallback(@Req() req: Request) {
    return this.authService.registerGoogle(req.user as GoogleUser);
  }

  @Get('google/login')
  @SkipThrottle()
  @UseGuards(AuthGuard('google-login'))
  googleLogin() {}

  @Get('google/login/callback')
  @SkipThrottle()
  @UseGuards(AuthGuard('google-login'))
  async googleLoginCallback(@Req() req: Request) {
    return this.authService.loginGoogle(req.user as GoogleUser);
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
  // SETUP SHOP
  // POST /api/auth/shop/setup
  // ============================================================
  @Post('shop/setup')
  @UseGuards(JwtAuthGuard)
  async setupShop(@Req() req: RequestWithUser, @Body() dto: ShopSetupDto) {
    return this.authService.setupShop(req.user.userId, dto);
  }
}
