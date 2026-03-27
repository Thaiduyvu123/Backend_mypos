import {
  Controller,
  Post,
  Get,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import { FastifyRequest } from 'fastify';
import { AdminAuthService } from './admin-auth.service';
import { LocalAuthGuard } from '../../common/guards/local-auth.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

interface FastifyRequestWithUser extends FastifyRequest {
  user: any;
  ip: string;
}

@ApiTags('Auth - Dashboard')
@Controller({ path: 'admin/auth', version: '1' })
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  // POST /api/v1/admin/auth/login
  @Post('login')
  @UseGuards(LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng nhập admin dashboard' })
  @ApiResponse({ status: 200, description: 'Trả về JWT token' })
  @ApiResponse({ status: 401, description: 'Sai thông tin đăng nhập' })
  async login(@Req() req: FastifyRequestWithUser) {
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);
    const userAgent = req.headers['user-agent'] as string;
    return this.adminAuthService.login(req.user, ip, userAgent);
  }

  // POST /api/v1/admin/auth/logout
  @Post('logout')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Đăng xuất admin' })
  async logout(@Req() req: FastifyRequestWithUser) {
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);
    const userAgent = req.headers['user-agent'] as string;
    return this.adminAuthService.logout(req.user, ip, userAgent);
  }

  // GET /api/v1/admin/auth/profile
  @Get('profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Lấy thông tin admin hiện tại' })
  getProfile(@Req() req: FastifyRequestWithUser) {
    return this.adminAuthService.getProfile(req.user._id);
  }
}
