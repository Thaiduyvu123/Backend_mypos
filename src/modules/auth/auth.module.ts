import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/modules/users/schemas/users.schema';
import { Shop, ShopSchema } from '../shops/schemas/shops.schema';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import {
  GoogleLoginStrategy,
  GoogleRegisterStrategy,
} from './strategies/google.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Shop.name, schema: ShopSchema },
    ]),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'your_secret_key',
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    GoogleLoginStrategy,
    GoogleRegisterStrategy,
    JwtStrategy,
  ],
})
export class AuthModule {}
