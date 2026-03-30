import { Controller, Get, Param } from '@nestjs/common';
import { ShopsService } from './shops.service';
import { SkipThrottle } from '@nestjs/throttler';

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
}