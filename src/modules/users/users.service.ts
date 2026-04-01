import { Injectable } from '@nestjs/common';
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
    const users = await this.userModel
      .find({ role: 'owner' })
      .lean()
      .exec();

    // Lấy tất cả shopId từ users
    const shopIds = users
      .filter(u => u.shopId)
      .map(u => u.shopId);

    // Lấy tất cả shops một lần
    const shops = await this.shopModel
      .find({ _id: { $in: shopIds } })
      .lean()
      .exec();

    // Map shopId → shop
    const shopMap = new Map(shops.map(s => [String(s._id), s]));

    // Gắn thông tin shop vào user
    return users.map(u => {
      const { passwordHash, ...userObj } = u;
      void passwordHash;
      return {
        ...userObj,
        shopId: u.shopId ? shopMap.get(String(u.shopId)) || null : null,
      };
    });
  }
}