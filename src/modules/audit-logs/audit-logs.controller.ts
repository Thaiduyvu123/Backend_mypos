import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard } from 'src/common/guards';
import { Roles } from 'src/common/decorators';
import { AuditLogsService } from './audit-logs.service';

@ApiTags('Audit Logs')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller({ path: 'audit-logs', version: '1' })
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all audit logs with filters' })
  @ApiQuery({ name: 'actor_id', required: false })
  @ApiQuery({
    name: 'action',
    required: false,
    enum: [
      'LOGIN',
      'LOGOUT',
      'CREATE',
      'UPDATE',
      'DELETE',
      'LOCK_USER',
      'UNLOCK_USER',
      'CHANGE_PASSWORD',
      'VIEW',
      'SYNC',
    ],
  })
  @ApiQuery({
    name: 'resource',
    required: false,
    enum: ['USER', 'SHOP', 'DEVICE', 'BUSINESS_TYPE', 'AUTH', 'SYNC'],
  })
  @ApiQuery({ name: 'success', required: false, type: Boolean })
  @ApiQuery({
    name: 'from_date',
    required: false,
    description: 'ISO date string',
  })
  @ApiQuery({
    name: 'to_date',
    required: false,
    description: 'ISO date string',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(@Query() query: any) {
    return this.auditLogsService.findAll(query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get audit log statistics' })
  getStats() {
    return this.auditLogsService.getStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get audit log by ID' })
  findOne(@Param('id') id: string) {
    return this.auditLogsService.findOne(id);
  }
}
