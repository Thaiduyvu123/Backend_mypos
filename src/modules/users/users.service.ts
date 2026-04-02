import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditAction, AuditResource } from '../audit-logs/schemas/audit-log.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/users.schema';
import { Shop, ShopDocument } from '../shops/schemas/shops.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(Shop.name)
    private readonly shopModel: Model<ShopDocument>,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async findAll() {
    const users = await this.userModel.find({ role: 'owner' }).lean().exec();
    const shopIds = users.filter(u => u.shopId).map(u => u.shopId);
    const shops = await this.shopModel.find({ _id: { $in: shopIds } }).lean().exec();
    const shopMap = new Map(shops.map(s => [String(s._id), s]));
    return users.map(u => {
      const { passwordHash, ...userObj } = u;
      void passwordHash;
      return { ...userObj, shopId: u.shopId ? shopMap.get(String(u.shopId)) || null : null };
    });
  }

  //  KHÓA / MỞ KHÓA
  async toggleLock(userId: string, isLocked: boolean, adminId: string, adminUsername: string) {
    const user = await this.userModel.findByIdAndUpdate(
      userId,
      { isLocked },
      { new: true }
    ).lean().exec();

    if (!user) throw new NotFoundException('Không tìm thấy user');

    const { passwordHash, ...userObj } = user;
    void passwordHash;
    await this.auditLogsService.create({
    actor_id: adminId,
    actor_username: adminUsername,
    action: isLocked ? AuditAction.LOCK_USER : AuditAction.UNLOCK_USER,
    resource: AuditResource.USER,
    resource_id: userId,
    success: true,
    description: `Admin ${adminUsername} đã ${isLocked ? 'khóa' : 'mở khóa'} tài khoản ${user.username}`,
});
    return { success: true, message: isLocked ? 'Đã khóa tài khoản' : 'Đã mở khóa tài khoản', user: userObj };
  }

  //  SỬA THÔNG TIN USER
  async updateUser(userId: string, dto: any, adminId: string, adminUsername: string) {
    const user = await this.userModel.findByIdAndUpdate(
      userId,
      {
        fullName: dto.fullName,
        email: dto.email,
        phone: dto.phone,
        businessType: dto.businessType,
      },
      { new: true }
    ).lean().exec();

    if (!user) throw new NotFoundException('Không tìm thấy user');

    // Nếu có shopName thì cập nhật shop luôn
    if (dto.shopName && user.shopId) {
      await this.shopModel.findByIdAndUpdate(
        user.shopId,
        { name: dto.shopName, city: dto.city },
        { new: true }
      ).lean().exec();
    }

    const { passwordHash, ...userObj } = user;
    void passwordHash;
    await this.auditLogsService.create({
    actor_id: adminId,
    actor_username: adminUsername,
    action: AuditAction.UPDATE,
    resource: AuditResource.USER,
    resource_id: userId,
    success: true,
    description: `Admin ${adminUsername} đã cập nhật tài khoản ${userObj.username}`,
});
    return { success: true, message: 'Cập nhật thành công', user: userObj };
  }
}