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

  // ✅ Hàm setupShop đã được trả về nguyên bản như cũ
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
}