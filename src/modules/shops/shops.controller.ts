import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ShopsService } from './shops.service';
import { SkipThrottle } from '@nestjs/throttler';
import { JwtAuthGuard } from 'src/common/guards';
import { UpdateShopInfoDto } from './dto/update-shop-info.dto';
import { FastifyRequest } from 'fastify';

interface RequestWithUser extends FastifyRequest {
  user: {
    _id: string;
    shopId: string;
    role: string;
  };
}

@Controller('shops')
@SkipThrottle()
export class ShopsController {
  constructor(private readonly shopsService: ShopsService) {}

  // GET /api/shops - Public, dùng cho map ở landing page
  @Get()
  async findAll() {
    return this.shopsService.findAll();
  }

  // GET /api/shops/:id
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.shopsService.findOne(id);
  }

  // ============================================================
  // PATCH /api/shops/update-info
  // Cập nhật thông tin shop (yêu cầu JWT — chỉ owner của shop)
  // Body (tất cả optional):
  //   businessType  string[]   ['accommodation','sale']
  //   address       string
  //   city          string
  //   country       string
  //   taxCode       string
  //   name          string
  //   shopPhone     string
  //   shopEmail     string
  // ============================================================
  @Patch('update-info')
  @UseGuards(JwtAuthGuard)
  async updateShopInfo(
    @Req() req: RequestWithUser,
    @Body() dto: UpdateShopInfoDto,
  ) {
    const shopId = req.user.shopId;
    return this.shopsService.updateShopInfo(shopId, dto);
  }
}
