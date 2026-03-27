import { IsEmail, IsString, Length } from 'class-validator';

// Bước 1: Xác thực email trước khi đăng ký
export class PreRegisterDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email!: string;
}

// Bước 2: Xác thực OTP email
export class VerifyEmailDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email!: string;

  @IsString()
  @Length(6, 6, { message: 'OTP phải có đúng 6 ký tự' })
  otpCode!: string;
}
