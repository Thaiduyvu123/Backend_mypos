import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PasswordService } from './password.service';
import { PasswordController } from './password.controller';
import { EmailService } from './email.service';
import { EmailVerificationService } from './email-verification.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../users/schemas/users.schema';
import { Shop, ShopSchema } from '../shops/schemas/shops.schema';
import { Otp, OtpSchema } from './schemas/otp.schema';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  GoogleLoginStrategy,
  GoogleRegisterStrategy,
} from './strategies/google.strategy';
import { JwtStrategy } from '../../common/strategies/jwt.strategy';
import { GeocodingService } from './geocoding.service';
import { DevicesModule } from '../devices/devices.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Shop.name, schema: ShopSchema },
      { name: Otp.name, schema: OtpSchema },
    ]),
    PassportModule,
    // ✅ Dùng registerAsync để ConfigModule load xong trước khi đọc JWT_SECRET
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'your_secret_key'),
        signOptions: { expiresIn: 86400 },
      }),
      inject: [ConfigService],
    }),
    DevicesModule,
  ],
  controllers: [AuthController, PasswordController],
  providers: [
    AuthService,
    PasswordService,
    EmailService,
    EmailVerificationService,
    GoogleLoginStrategy,
    GoogleRegisterStrategy,
    JwtStrategy,
    GeocodingService,
  ],
})
export class AuthModule {}