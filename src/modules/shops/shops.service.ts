import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Shop, ShopDocument } from './schemas/shops.schema';

@Injectable()
export class ShopsService {
  constructor(
    @InjectModel(Shop.name)
    private readonly shopModel: Model<ShopDocument>,
  ) {}

  async findAll() {
    return this.shopModel
      .find({ lat: { $exists: true }, lng: { $exists: true } })
      .select('name address city businessType lat lng')
      .lean()
      .exec();
  }
}