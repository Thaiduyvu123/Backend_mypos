import { Controller, Get, Put, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UsersService } from './users.service';

@Controller({ path: 'admin/users', version: '1' })
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // GET /api/v1/admin/users
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async findAll() {
    return this.usersService.findAll();
  }

  // PUT /api/v1/admin/users/:id
  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async updateUser(@Param('id') id: string, @Body() dto: any) {
    return this.usersService.updateUser(id, dto);
  }

  // PATCH /api/v1/admin/users/:id/toggle-status
  @Patch(':id/toggle-status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async toggleStatus(@Param('id') id: string, @Body() body: { isLocked: boolean }) {
    return this.usersService.toggleLock(id, body.isLocked);
  }
}