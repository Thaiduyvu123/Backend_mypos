import { IsString, IsNotEmpty, IsOptional, IsEmail } from 'class-validator';

export class ShopSetupDto {
  @IsString()
  @IsNotEmpty({ message: 'Tên shop không được để trống' })
  name!: string;

  @IsString()
  @IsNotEmpty({ message: 'Tên chủ shop không được để trống' })
  ownerName!: string;

  @IsString()
  @IsNotEmpty({ message: 'Số điện thoại không được để trống' })
  phone!: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email?: string;

  @IsString()
  @IsNotEmpty({ message: 'Địa chỉ không được để trống' })
  address!: string;

  @IsString()
  @IsNotEmpty({ message: 'Thành phố không được để trống' })
  city!: string;

  @IsString()
  @IsNotEmpty({ message: 'Quốc gia không được để trống' })
  country!: string;

  @IsString()
  @IsNotEmpty({ message: 'Loại hình kinh doanh không được để trống' })
  businessType!: string;

  @IsOptional()
  @IsString()
  taxCode?: string;
}
