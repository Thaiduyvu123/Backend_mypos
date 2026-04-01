import { Injectable, NotFoundException } from '@nestjs/common';
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
  async toggleLock(userId: string, isLocked: boolean) {
    const user = await this.userModel.findByIdAndUpdate(
      userId,
      { isLocked },
      { new: true }
    ).lean().exec();

    if (!user) throw new NotFoundException('Không tìm thấy user');

    const { passwordHash, ...userObj } = user;
    void passwordHash;
    return { success: true, message: isLocked ? 'Đã khóa tài khoản' : 'Đã mở khóa tài khoản', user: userObj };
  }

  //  SỬA THÔNG TIN USER
  async updateUser(userId: string, dto: any) {
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
    return { success: true, message: 'Cập nhật thành công', user: userObj };
  }
}