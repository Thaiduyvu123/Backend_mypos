import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  _id!: string;

  @Prop({ default: null, type: String })
  shopId!: string | null; // Cho phép null

  @Prop({ required: true, unique: true })
  username!: string;

  @Prop({ default: null, type: String })
  passwordHash!: string | null; // Cho phép null

  @Prop({ required: true })
  fullName!: string;

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
  providerId!: string | null; // Cho phép null

  @Prop({ default: false })
  shopSetupDone!: boolean;

  @Prop({ default: true })
  isActive!: boolean;

  @Prop({ default: 1 })
  syncStatus!: number;

  @Prop()
  deviceId!: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
