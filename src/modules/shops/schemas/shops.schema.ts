import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ShopDocument = Shop & Document;

@Schema({ timestamps: true })
export class Shop {
  @Prop({ required: true })
  _id!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  ownerName!: string;

  @Prop({ required: true })
  phone!: string;

  @Prop()
  email!: string;

  @Prop({ required: true })
  address!: string;

  @Prop({ required: true })
  city!: string;

  @Prop({ required: true })
  country!: string;

  // ✅ Đổi thành array string
  @Prop({ type: [String], enum: ['accommodation', 'sale'], required: true })
  businessType!: string[];

  @Prop()
  taxCode!: string;

  @Prop({ default: null, type: Number })
  lat!: number | null;

  @Prop({ default: null, type: Number })
  lng!: number | null;

  @Prop({ default: 1 })
  syncStatus!: number;

  @Prop()
  deviceId!: string;
}

export const ShopSchema = SchemaFactory.createForClass(Shop);
