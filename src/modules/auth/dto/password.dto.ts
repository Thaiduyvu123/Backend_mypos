import {
  IsString,
  MinLength,
  IsEmail,
  IsNotEmpty,
  Length,
} from 'class-validator';

// DTO đổi mật khẩu (đã đăng nhập)
export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'Mật khẩu cũ không được để trống' })
  oldPassword!: string;

  @IsString()
  @MinLength(6, { message: 'Mật khẩu mới phải có ít nhất 6 ký tự' })
  newPassword!: string;
}

// DTO quên mật khẩu - bước 1: nhập email
export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email!: string;
}

// DTO quên mật khẩu - bước 2: xác thực OTP
export class VerifyOtpDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email!: string;

  @IsString()
  @Length(6, 6, { message: 'OTP phải có đúng 6 ký tự' })
  otpCode!: string;
}

// DTO quên mật khẩu - bước 3: đặt lại mật khẩu
export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'Reset token không được để trống' })
  resetToken!: string;

  @IsString()
  @MinLength(6, { message: 'Mật khẩu mới phải có ít nhất 6 ký tự' })
  newPassword!: string;
}
