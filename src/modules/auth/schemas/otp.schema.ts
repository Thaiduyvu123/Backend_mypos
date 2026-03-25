import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type OtpDocument = Otp & Document;

@Schema({ timestamps: true })
export class Otp {
  @Prop({ required: true, unique: true })
  _id!: string;

  @Prop({ required: true })
  email!: string;

  @Prop({ required: true })
  otpCode!: string; // 6 số

  @Prop({ required: true })
  expiresAt!: Date; // Hết hạn sau 5 phút

  @Prop({ default: false })
  isUsed!: boolean; // Đã dùng chưa

  @Prop({ default: 0 })
  attempts!: number; // Số lần nhập sai (max 5)

  // ✅ Phân biệt OTP đăng ký vs quên mật khẩu
  @Prop({
    enum: ['register', 'forgot_password'],
    required: true,
  })
  purpose!: string;
}
export const OtpSchema = SchemaFactory.createForClass(Otp);

// Tự động xóa OTP hết hạn
OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
OtpSchema.index({ email: 1, purpose: 1 });
