import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Get } from '@nestjs/common';
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
  user: {
    _id: string;
    username: string;
    role: string;
    shopId: string;
    pendingUserData?: {
      passwordHash: string;
      username: string;
      fullName: string;
      email: string;
      phone?: string;
    };
  };
}

@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly emailVerificationService: EmailVerificationService,
  ) {}

  // ============================================================
  // ĐĂNG KÝ LOCAL - BƯỚC 1: Gửi OTP xác thực email
  // POST /api/auth/pre-register
  // ============================================================
  @Post('pre-register')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  async preRegister(@Body() dto: PreRegisterDto) {
    return this.emailVerificationService.preRegister(dto);
  }

  // ============================================================
  // ĐĂNG KÝ LOCAL - BƯỚC 2: Xác thực OTP email → nhận verifiedToken
  // POST /api/auth/verify-email
  // ============================================================
  @Post('verify-email')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.emailVerificationService.verifyEmail(dto);
  }

  // ============================================================
  // ĐĂNG KÝ LOCAL - BƯỚC 3: Đăng ký tài khoản (cần verifiedToken)
  // POST /api/auth/register
  // ============================================================
  @Post('register')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  async registerLocal(@Body() dto: RegisterLocalDto) {
    return this.authService.registerLocal(dto);
  }

  // ============================================================
  // ĐĂNG NHẬP LOCAL
  // POST /api/auth/login  — đổi từ GET sang POST để tránh lộ password trên URL
  // Body: { username, password }
  // ============================================================
  @Post('login')
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  async loginLocal(
    @Body('username') username: string,
    @Body('password') password: string,
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
  async googleRegisterCallback(
    @Req() req: FastifyRequest & { user?: GoogleUser },
    @Res() res: any,
  ) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    try {
      const result = await this.authService.registerGoogle(req.user! as GoogleUser);
      const token = result.access_token as string;
      return res.redirect(
        `${frontendUrl}/auth/google/callback?token=${token}`,
      );
    } catch {
      return res.redirect(
        `${frontendUrl}/register?error=email_exists`,
      );
    }
  }

  @Get('google/login')
  @SkipThrottle()
  @UseGuards(AuthGuard('google-login'))
  googleLogin() {}

  @Get('google/login/callback')
  @SkipThrottle()
  @UseGuards(AuthGuard('google-login'))
  async googleLoginCallback(
    @Req() req: FastifyRequest & { user?: GoogleUser },
    @Res() res: any,
  ) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    try {
      const result = await this.authService.loginGoogle(req.user! as GoogleUser);
      const token = result.access_token as string;
      const shopSetupDone = result.shopSetupDone ? 'true' : 'false';
      return res.redirect(
        `${frontendUrl}/auth/google/callback?token=${token}&shopSetupDone=${shopSetupDone}`,
      );
    } catch {
      return res.redirect(
        `${frontendUrl}/register?error=not_registered`,
      );
    }
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
  // SETUP SHOP (sau khi đăng ký)
  // POST /api/auth/shop/setup
  // ============================================================
  @Post('shop/setup')
  @UseGuards(JwtAuthGuard)
  async setupShop(
    @Req() req: FastifyRequestWithUser,
    @Body() dto: ShopSetupDto,
  ) {
    const userId = req.user._id;
    const pendingUserData = req.user.pendingUserData;
    return this.authService.setupShop(userId, dto, pendingUserData);
  }

  // ============================================================
  // DIAGNOSTIC: Test Gmail Configuration
  // GET /api/auth/email/test
  // Use this to verify Gmail credentials are working
  // ============================================================
  @Get('email/test')
  @SkipThrottle()
  async testEmailConfiguration() {
    return this.emailVerificationService.testEmailConfiguration();
  }
}
