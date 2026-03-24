import { Controller, Get } from '@nestjs/common';
import { ShopsService } from './shops.service';

@Controller('shops')
export class ShopsController {
  constructor(private readonly shopsService: ShopsService) {}

  // GET /api/shops
  @Get()
  async findAll() {
    const shops = await this.shopsService.findAll();
    return { success: true, data: shops };
  }
}