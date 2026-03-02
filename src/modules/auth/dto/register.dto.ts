import { IsString, MinLength, IsNotEmpty, IsOptional } from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty({ message: 'Shop ID không được để trống' })
  // @IsMongoId() // Bật cái này nếu shopId là MongoDB ObjectId
  shopId!: string;

  @IsString()
  @IsNotEmpty({ message: 'Tên đăng nhập không được để trống' })
  username!: string;

  @IsString()
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  password!: string;

  @IsString()
  @IsNotEmpty({ message: 'Họ tên không được để trống' })
  fullName!: string;

  @IsString()
  @IsOptional() // Nếu trường này không bắt buộc, hãy dùng IsOptional
  phoneNumber?: string;
}
