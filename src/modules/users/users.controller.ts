// src/modules/users/users.controller.ts
import {
  Controller,
  Get,
  Put,
  Patch,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UsersService } from './users.service';
import { UpdateProfileDto, UpdateAvatarDto } from './dto/update-profile.dto';

@Controller({ version: '1' })
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ─────────────────────────────────────────────────────────────────────────
  // PROFILE CỦA CHÍNH MÌNH (mọi user đã login đều dùng được)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * GET /api/v1/users/me
   * Lấy thông tin hồ sơ của user đang đăng nhập.
   * Token: { sub: userId, ... }
   */
  @Get('users/me')
  @UseGuards(JwtAuthGuard)
  async getMyProfile(@Req() req: any) {
    const userId = req.user?.sub ?? req.user?._id;
    return this.usersService.getMyProfile(userId);
  }

  /**
   * PUT /api/v1/users/me
   * Cập nhật hồ sơ: fullName, phone, email
   */
  @Put('users/me')
  @UseGuards(JwtAuthGuard)
  async updateMyProfile(@Req() req: any, @Body() dto: UpdateProfileDto) {
    const userId = req.user?.sub ?? req.user?._id;
    return this.usersService.updateMyProfile(userId, dto);
  }

  /**
   * PUT /api/v1/users/me/avatar
   * Cập nhật URL ảnh đại diện
   */
  @Put('users/me/avatar')
  @UseGuards(JwtAuthGuard)
  async updateMyAvatar(@Req() req: any, @Body() dto: UpdateAvatarDto) {
    const userId = req.user?.sub ?? req.user?._id;
    return this.usersService.updateMyAvatar(userId, dto);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ADMIN ENDPOINTS
  // ─────────────────────────────────────────────────────────────────────────

  /** GET /api/v1/admin/users */
  @Get('admin/users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async findAll() {
    return this.usersService.findAll();
  }

  /** PUT /api/v1/admin/users/:id */
  @Put('admin/users/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async updateUser(
    @Param('id') id: string,
    @Body() dto: any,
    @Req() req: any,
  ) {
    const adminId = req.user?.sub || req.user?._id || 'unknown';
    const adminUsername = req.user?.username || 'unknown';
    return this.usersService.updateUser(id, dto, adminId, adminUsername);
  }

  /** PATCH /api/v1/admin/users/:id/toggle-status */
  @Patch('admin/users/:id/toggle-status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async toggleStatus(
    @Param('id') id: string,
    @Body() body: { isLocked: boolean },
    @Req() req: any,
  ) {
    const adminId = req.user?.sub || req.user?._id || 'unknown';
    const adminUsername = req.user?.username || 'unknown';
    return this.usersService.toggleLock(
      id,
      body.isLocked,
      adminId,
      adminUsername,
    );
  }
}
