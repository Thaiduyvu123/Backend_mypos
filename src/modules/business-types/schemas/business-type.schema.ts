import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type BusinessTypeDocument = BusinessType & Document;

@Schema({ timestamps: true })
export class BusinessType {
  @Prop({ required: true, unique: true })
  _id!: string;

  @Prop({ required: true })
  code!: string;             // restaurant, cafe, retail...

  @Prop({ required: true })
  nameVi!: string;           // Quán ăn / Nhà hàng

  @Prop({ required: true })
  nameEn!: string;           // Restaurant / Food & Beverage

  @Prop()
  icon!: string;             // emoji hoặc icon name

  @Prop({ default: 0 })
  sortOrder!: number;

  @Prop({ default: true })
  isActive!: boolean;
}

export const BusinessTypeSchema = SchemaFactory.createForClass(BusinessType);
