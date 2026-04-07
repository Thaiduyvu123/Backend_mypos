import {
  IsString,
  MinLength,
  IsNotEmpty,
  IsOptional,
  IsEmail,
} from 'class-validator';

export class RegisterLocalDto {
  //  verifiedToken từ bước verify-email
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng xác thực email trước khi đăng ký' })
  verifiedToken!: string;

  @IsString()
  @IsNotEmpty({ message: 'Username không được để trống' })
  username!: string;

  @IsString()
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  password!: string;

  @IsString()
  @IsNotEmpty({ message: 'Họ tên không được để trống' })
  fullName!: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
