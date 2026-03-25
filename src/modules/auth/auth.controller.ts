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
import { FastifyRequest } from 'fastify'; // ✅ Dùng FastifyRequest
import { AuthService } from './auth.service';
import { EmailVerificationService } from './email-verification.service';
import { RegisterLocalDto } from './dto/register-local.dto';
import { ShopSetupDto } from './dto/shop-setup.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
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

  @Post('pre-register')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  async preRegister(@Body() dto: PreRegisterDto) {
    return this.emailVerificationService.preRegister(dto);
  }

  @Post('verify-email')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.emailVerificationService.verifyEmail(dto);
  }

  @Post('register')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  async registerLocal(@Body() dto: RegisterLocalDto) {
    return this.authService.registerLocal(dto);
  }

  @Get('login/:username/:password')
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  async loginLocal(
    @Param('username') username: string,
    @Param('password') password: string,
  ) {
    return this.authService.loginLocal(username, password);
  }

  @Get('google/register')
  @SkipThrottle()
  @UseGuards(AuthGuard('google-register'))
  googleRegister() {}

  @Get('google/register/callback')
  @SkipThrottle()
  @UseGuards(AuthGuard('google-register'))
  async googleRegisterCallback(@Req() req: FastifyRequest) {
    return this.authService.registerGoogle(req.user as GoogleUser);
  }

  @Get('google/login')
  @SkipThrottle()
  @UseGuards(AuthGuard('google-login'))
  googleLogin() {}

  @Get('google/login/callback')
  @SkipThrottle()
  @UseGuards(AuthGuard('google-login'))
  async googleLoginCallback(@Req() req: FastifyRequest) {
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

  @Post('shop/setup')
  @UseGuards(JwtAuthGuard)
  async setupShop(
    @Req() req: FastifyRequestWithUser,
    @Body() dto: ShopSetupDto,
  ) {
    return this.authService.setupShop(req.user.userId, dto);
  }
}
