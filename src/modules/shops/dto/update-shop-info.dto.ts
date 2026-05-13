import {
  IsString,
  IsOptional,
  IsEmail,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  IsEnum,
} from 'class-validator';
import { BusinessTypeEnum } from '../../auth/dto/shop-setup.dto';

export class UpdateShopInfoDto {
  // ── Loại hình kinh doanh ──────────────────────────────────
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'Chọn ít nhất 1 loại hình kinh doanh' })
  @ArrayMaxSize(2, { message: 'Chỉ được chọn tối đa 2 loại hình kinh doanh' })
  @IsEnum(BusinessTypeEnum, {
    each: true,
    message: 'Loại hình không hợp lệ. Chỉ chấp nhận: accommodation, sale',
  })
  businessType?: BusinessTypeEnum[];

  // ── Địa chỉ (khi thay đổi sẽ re-geocode lat/lng) ─────────
  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  country?: string;

  // ── Mã số thuế ────────────────────────────────────────────
  @IsOptional()
  @IsString()
  taxCode?: string;

  // ── Tên shop ──────────────────────────────────────────────
  @IsOptional()
  @IsString()
  name?: string;

  // ── Số điện thoại shop ────────────────────────────────────
  @IsOptional()
  @IsString()
  shopPhone?: string;

  // ── Email shop ────────────────────────────────────────────
  @IsOptional()
  @IsEmail({}, { message: 'Email shop không hợp lệ' })
  shopEmail?: string;
}
