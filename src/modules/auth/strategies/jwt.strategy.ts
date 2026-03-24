import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
 
export interface JwtPayload {
  sub: string;
  username: string;
  role: string;
  shopId: string | null;
  //  Thêm field này để lưu thông tin user chờ tạo
  pendingUserData?: {
    passwordHash: string;
    fullName: string;
    email: string;
    phone: string | null;
  };
}
 
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'mypos_secret_key_2026',
    });
  }
 
  validate(payload: JwtPayload) {
    return {
      userId: payload.sub,
      username: payload.username,
      role: payload.role,
      shopId: payload.shopId,
      //  Thêm dòng này để truyền thông tin pending
      pendingUserData: payload.pendingUserData,
    };
  }
}