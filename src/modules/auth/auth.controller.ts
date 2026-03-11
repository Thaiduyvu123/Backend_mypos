import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterLocalDto } from 'src/modules/auth/dto/register-local.dto';
import { ShopSetupDto } from './dto/shop-setup.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleUser } from './strategies/google.strategy';

interface RequestWithUser extends Request {
  user: {
    userId: string;
    username: string;
    role: string;
    shopId: string | null;
  };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ============================================================
  // ĐĂNG KÝ LOCAL
  // POST /api/auth/register
  // Body: { username, password, fullName, email?, phone? }
  // ============================================================
  @Post('register')
  async registerLocal(@Body() dto: RegisterLocalDto) {
    return this.authService.registerLocal(dto);
  }

  // ============================================================
  // ĐĂNG NHẬP LOCAL
  // GET /api/auth/login/:username/:password
  // ============================================================
  @Get('login/:username/:password')
  async loginLocal(
    @Param('username') username: string,
    @Param('password') password: string,
  ) {
    return this.authService.loginLocal(username, password);
  }

  // ============================================================
  // ĐĂNG KÝ GOOGLE - Web redirect
  // GET /api/auth/google/register → redirect Google
  // ============================================================
  @Get('google/register')
  @UseGuards(AuthGuard('google-register'))
  googleRegirect() {
    // Passport tự redirect tới Google
  }

  // GET /api/auth/google/register/callback
  @Get('google/register/callback')
  @UseGuards(AuthGuard('google-register'))
  async googleRegisterCallback(@Req() req: Request) {
    return this.authService.registerGoogle(req.user as GoogleUser);
  }

  // ============================================================
  // ĐĂNG NHẬP GOOGLE - Web redirect
  // GET /api/auth/google/login → redirect Google
  // ============================================================
  @Get('google/login')
  @UseGuards(AuthGuard('google-login'))
  googleLogin() {
    // Passport tự redirect tới Google
  }

  // GET /api/auth/google/login/callback
  @Get('google/login/callback')
  @UseGuards(AuthGuard('google-login'))
  async googleLoginCallback(@Req() req: Request) {
    return this.authService.loginGoogle(req.user as GoogleUser);
  }

  // ============================================================
  // GOOGLE TOKEN TỪ MOBILE/FE
  // POST /api/auth/google/token
  // Body: { idToken, mode: 'login' | 'register' }
  // ============================================================
  @Post('google/token')
  async googleToken(
    @Body('idToken') idToken: string,
    @Body('mode') mode: 'login' | 'register',
  ) {
    return this.authService.googleWithToken(idToken, mode);
  }

  // ============================================================
  // SETUP SHOP (sau khi đăng ký)
  // POST /api/auth/shop/setup
  // Header: Authorization: Bearer <token>
  // Body: ShopSetupDto
  // ============================================================
  @Post('shop/setup')
  @UseGuards(JwtAuthGuard)
  async setupShop(@Req() req: RequestWithUser, @Body() dto: ShopSetupDto) {
    return this.authService.setupShop(req.user.userId, dto);
  }
}
