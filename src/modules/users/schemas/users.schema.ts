import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ collection: 'users', timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  _id!: string;

  @Prop({ default: null, type: String })
  shopId!: string | null;

  @Prop({ required: true, unique: true })
  username!: string;

  @Prop({ default: null, type: String })
  passwordHash!: string | null;

  @Prop({ required: true })
  fullName!: string;

  // admin = quản lý hệ thống, owner = chủ shop
  @Prop({ enum: ['admin', 'owner'], default: 'owner' })
  role!: string;

  @Prop()
  avatarUrl!: string;

  @Prop()
  email!: string;

  @Prop()
  phone!: string;

  @Prop({ enum: ['local', 'google'], default: 'local' })
  provider!: string;

  @Prop({ default: null, type: String })
  providerId!: string | null;

  @Prop({ type: [String], enum: ['accommodation', 'sale'], default: [] })
  businessType!: string[];

  @Prop({ default: false })
  shopSetupDone!: boolean;

  @Prop({ default: true })
  isActive!: boolean;

  @Prop({ default: false })
  isLocked!: boolean;

  @Prop({ default: null, type: Date })
  lockedUntil!: Date | null;

  @Prop({ default: 0 })
  failedLoginAttempts!: number;

  @Prop({ default: null, type: Date })
  lastLoginAt!: Date | null;

  @Prop({ default: 1 })
  syncStatus!: number;

  @Prop()
  deviceId!: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
UserSchema.index({ username: 1 });
UserSchema.index({ email: 1 });
UserSchema.index({ shopId: 1 });
UserSchema.index({ role: 1 });
