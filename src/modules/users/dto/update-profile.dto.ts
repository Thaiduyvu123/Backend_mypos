import { IsString, IsOptional, IsEmail, MaxLength, MinLength } from 'class-validator';
 
export class UpdateProfileDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName!: string;
 
  @IsOptional()
  @IsEmail()
  email?: string;
 
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;
}
 
export class UpdateAvatarDto {
  @IsString()
  avatarUrl!: string;
}
