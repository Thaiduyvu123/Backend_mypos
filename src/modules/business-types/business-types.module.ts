// =============================================
// business-types.schema.ts
// =============================================
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type BusinessTypeDocument = BusinessType & Document;

@Schema({ timestamps: true })
export class BusinessType {
  @Prop({ required: true, unique: true })
  _id!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  nameEn!: string;

  @Prop()
  icon!: string;

  @Prop({ default: 0 })
  sortOrder!: number;

  @Prop({ default: true })
  isActive!: boolean;
}

export const BusinessTypeSchema = SchemaFactory.createForClass(BusinessType);

// =============================================
// business-types.service.ts
// =============================================
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class BusinessTypesService {
  constructor(
    @InjectModel(BusinessType.name)
    private readonly businessTypeModel: Model<BusinessTypeDocument>,
  ) {}

  async findAll(): Promise<BusinessType[]> {
    return this.businessTypeModel
      .find({ isActive: true })
      .sort({ sortOrder: 1 })
      .lean()
      .exec();
  }
}

// =============================================
// business-types.controller.ts
// =============================================
import { Controller, Get } from '@nestjs/common';

@Controller('business-types')
export class BusinessTypesController {
  constructor(private readonly businessTypesService: BusinessTypesService) {}

  // GET /api/business-types
  @Get()
  async findAll() {
    const types = await this.businessTypesService.findAll();
    return {
      success: true,
      data: types,
    };
  }
}

// =============================================
// business-types.module.ts
// =============================================
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BusinessType.name, schema: BusinessTypeSchema },
    ]),
  ],
  controllers: [BusinessTypesController],
  providers: [BusinessTypesService],
  exports: [BusinessTypesService],
})
export class BusinessTypesModule {}
