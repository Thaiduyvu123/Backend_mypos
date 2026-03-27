// import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
// import { Document } from 'mongoose';

// export type OtpDocument = Otp & Document;

// @Schema({ timestamps: true })
// export class Otp {
//   @Prop({ required: true, unique: true })
//   _id!: string;

//   @Prop({ required: true })
//   email!: string;

//   @Prop({ required: true })
//   otpCode!: string;

//   @Prop({ required: true })
//   expiresAt!: Date;

//   @Prop({ default: false })
//   isUsed!: boolean;

//   @Prop({ default: 0 })
//   attempts!: number;

//   // ✅ Phân biệt OTP đăng ký vs quên mật khẩu
//   @Prop({
//     enum: ['register', 'forgot_password'],
//     default: 'forgot_password',
//   })
//   purpose!: string;
// }

// export const OtpSchema = SchemaFactory.createForClass(Otp);

// // Tự động xóa OTP hết hạn
// OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
// OtpSchema.index({ email: 1, purpose: 1 });
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
  otpCode!: string;

  @Prop({ required: true })
  expiresAt!: Date;

  @Prop({ default: false })
  isUsed!: boolean;

  @Prop({ default: 0 })
  attempts!: number;

  // ✅ Phân biệt mục đích OTP
  @Prop({
    enum: ['register', 'forgot_password', 'change_password'],
    default: 'forgot_password',
  })
  purpose!: string;
}

export const OtpSchema = SchemaFactory.createForClass(Otp);

// Tự động xóa OTP hết hạn
OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
OtpSchema.index({ email: 1, purpose: 1 });
