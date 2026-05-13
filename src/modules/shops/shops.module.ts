import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Shop, ShopSchema } from './schemas/shops.schema';
import { ShopsService } from './shops.service';
import { ShopsController } from './shops.controller';
import { GeocodingService } from '../auth/geocoding.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Shop.name, schema: ShopSchema }]),
  ],
  controllers: [ShopsController],
  providers: [ShopsService, GeocodingService],
  exports: [MongooseModule],
})
export class ShopsModule {}
