import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Shop, ShopDocument } from './schemas/shops.schema';

@Injectable()
export class ShopsService {
  constructor(
    @InjectModel(Shop.name)
    private readonly shopModel: Model<ShopDocument>,
  ) {}

  // GET /api/shops - Lấy tất cả shops (public, dùng cho map)
  async findAll(): Promise<Record<string, unknown>> {
    const shops = await this.shopModel
      .find()
      .select('_id name ownerName address city country businessType lat lng')
      .lean()
      .exec();

    return {
      success: true,
      data: shops,
      total: shops.length,
    };
  }

  // GET /api/shops/:id - Lấy 1 shop theo id
  async findOne(id: string): Promise<Record<string, unknown>> {
    const shop = await this.shopModel.findById(id).lean().exec();
    if (!shop) throw new NotFoundException('Không tìm thấy shop');
    return { success: true, data: shop };
  }
}
