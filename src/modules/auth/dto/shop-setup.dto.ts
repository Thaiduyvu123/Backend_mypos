import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  IsEnum,
} from 'class-validator';

// ✅ Đổi tên thành BusinessTypeEnum để tránh xung đột với class BusinessType
export enum BusinessTypeEnum {
  ACCOMMODATION = 'accommodation',
  SALE = 'sale',
}

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

  @IsArray()
  @ArrayMinSize(1, { message: 'Chọn ít nhất 1 loại hình kinh doanh' })
  @ArrayMaxSize(2, { message: 'Chỉ được chọn tối đa 2 loại hình kinh doanh' })
  @IsEnum(BusinessTypeEnum, {
    each: true,
    message: 'Loại hình không hợp lệ. Chỉ chấp nhận: accommodation, sale',
  })
  businessType!: BusinessTypeEnum[];

  @IsOptional()
  @IsString()
  taxCode?: string;
}
