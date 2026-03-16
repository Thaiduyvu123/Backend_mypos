import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type DeviceDocument = Device & Document;

@Schema({ timestamps: true })
export class Device {
  @Prop({ required: true, unique: true })
  _id!: string;

  @Prop({ required: true })
  userId!: string; // Thuộc về user nào

  @Prop({ required: true })
  deviceName!: string; // VD: "iPhone 15 Pro", "Chrome on Windows"

  @Prop()
  platform!: string; // VD: "ios", "android", "web", "windows"

  @Prop()
  appVersion!: string; // VD: "1.0.0"

  @Prop()
  userAgent!: string; // Browser/app user agent

  @Prop({ default: true })
  isActive!: boolean; // false = đã bị đăng xuất

  @Prop({ default: null, type: Date })
  lastActiveAt!: Date | null;

  @Prop({ default: null, type: Date })
  loggedOutAt!: Date | null;

  @Prop({ default: 1 })
  syncStatus!: number;
}

export const DeviceSchema = SchemaFactory.createForClass(Device);

// Index để query nhanh theo userId
DeviceSchema.index({ userId: 1, isActive: 1 });
