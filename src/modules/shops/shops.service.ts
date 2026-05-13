import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Shop, ShopDocument } from './schemas/shops.schema';
import { UpdateShopInfoDto } from './dto/update-shop-info.dto';
import { GeocodingService } from '../auth/geocoding.service';

@Injectable()
export class ShopsService {
  constructor(
    @InjectModel(Shop.name)
    private readonly shopModel: Model<ShopDocument>,
    private readonly geocodingService: GeocodingService,
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

  // ============================================================
  // PATCH /api/shops/update-info
  // Cập nhật thông tin shop: businessType, địa chỉ (+ re-geocode),
  // taxCode, name, phone, email
  // Chỉ owner của shop mới được phép cập nhật (shopId từ JWT)
  // ============================================================
  async updateShopInfo(
    shopId: string,
    dto: UpdateShopInfoDto,
  ): Promise<Record<string, unknown>> {
    const shop = await this.shopModel.findById(shopId).exec();
    if (!shop) throw new NotFoundException('Không tìm thấy shop');

    // ── Cập nhật từng trường nếu được truyền vào ─────────────
    if (dto.businessType !== undefined) {
      shop.businessType = dto.businessType as string[];
    }
    if (dto.taxCode !== undefined) {
      shop.taxCode = dto.taxCode;
    }
    if (dto.name !== undefined) {
      shop.name = dto.name;
    }
    if (dto.shopPhone !== undefined) {
      shop.phone = dto.shopPhone;
    }
    if (dto.shopEmail !== undefined) {
      shop.email = dto.shopEmail;
    }

    // ── Nếu có thay đổi địa chỉ → re-geocode lat/lng ─────────
    const addressChanged =
      dto.address !== undefined ||
      dto.city !== undefined ||
      dto.country !== undefined;

    if (addressChanged) {
      // Dùng giá trị mới nếu có, giữ nguyên giá trị cũ nếu không truyền
      const newAddress = dto.address ?? shop.address;
      const newCity = dto.city ?? shop.city;
      const newCountry = dto.country ?? shop.country;

      shop.address = newAddress;
      shop.city = newCity;
      shop.country = newCountry;

      const { lat, lng } = await this.geocodingService.getCoordinates(
        newAddress,
        newCity,
        newCountry,
      );
      shop.lat = lat;
      shop.lng = lng;
    }

    await shop.save();

    const updated = shop.toObject();
    return {
      success: true,
      message: 'Cập nhật thông tin shop thành công',
      data: updated,
    };
  }
}
