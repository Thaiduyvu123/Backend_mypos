import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller'; // ✅ Thêm dòng này
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../users/schemas/users.schema';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'your_secret_key',
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [AuthController], // ✅ Thêm dòng này
  providers: [AuthService],
})
export class AuthModule {}
