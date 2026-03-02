import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  _id!: string; // ví dụ: user_001

  @Prop({ required: true })
  shopId!: string;

  @Prop({ required: true, unique: true })
  username!: string;

  @Prop({ required: true })
  passwordHash!: string;

  @Prop()
  fullName!: string;

  @Prop({ enum: ['admin', 'staff'], default: 'staff' })
  role!: string;

  @Prop({ default: true })
  isActive!: boolean;

  @Prop({ default: null })
  deletedAt!: Date;

  @Prop({ default: 1 })
  syncStatus!: number;

  @Prop()
  deviceId!: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
