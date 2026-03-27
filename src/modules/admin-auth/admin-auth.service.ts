import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from '../users/schemas/users.schema';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditAction, AuditResource } from '../audit-logs/schemas/audit-log.schema';

@Injectable()
export class AdminAuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService,
    private auditLogsService: AuditLogsService,
  ) {}

  // ✅ Chỉ cho phép role 'admin' đăng nhập dashboard
  async validateUser(username: string, password: string): Promise<any> {
    const user = await this.userModel.findOne({ username }).lean();
    if (!user) return null;

    // Chỉ admin mới được vào dashboard
    if (user.role !== 'admin') {
      throw new ForbiddenException('Chỉ admin mới được đăng nhập dashboard');
    }

    if (user.isLocked) throw new ForbiddenException('Tài khoản đã bị khóa');
    if (!user.isActive) throw new ForbiddenException('Tài khoản không hoạt động');
    if (!user.passwordHash) throw new ForbiddenException('Tài khoản không có mật khẩu');

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return null;

    const { passwordHash, ...result } = user;
    void passwordHash;
    return result;
  }

  async login(user: any, ip?: string, userAgent?: string) {
    const payload = {
      sub: user._id,
      username: user.username,
      role: user.role,
      shopId: user.shopId,
    };

    const token = this.jwtService.sign(payload);

    // Audit log
    await this.auditLogsService.create({
      actor_id: user._id,
      actor_username: user.username,
      action: AuditAction.LOGIN,
      resource: AuditResource.AUTH,
      ip_address: ip,
      user_agent: userAgent,
      success: true,
      description: `Admin ${user.username} đăng nhập dashboard`,
    });

    return {
      access_token: token,
      user: {
        id: user._id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        email: user.email,
        avatarUrl: user.avatarUrl,
        shopId: user.shopId,
      },
    };
  }

  async logout(user: any, ip?: string, userAgent?: string) {
    await this.auditLogsService.create({
      actor_id: user._id,
      actor_username: user.username,
      action: AuditAction.LOGOUT,
      resource: AuditResource.AUTH,
      ip_address: ip,
      user_agent: userAgent,
      success: true,
      description: `Admin ${user.username} đăng xuất`,
    });
    return { message: 'Đăng xuất thành công' };
  }

  async getProfile(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select('-passwordHash')
      .lean();
    if (!user) throw new UnauthorizedException();
    return user;
  }
}
