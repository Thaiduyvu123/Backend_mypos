import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../modules/users/schemas/users.schema';

export interface JwtPayload {
  sub: string;
  username: string;
  role: string;
  shopId: string | null;
  businessTypes: string; // "rental,sale" | "rental" | "sale" | ""
  pendingUserData?: {
    passwordHash: string | null;
    username: string;
    fullName: string;
    email: string;
    phone?: string;
    provider?: 'local' | 'google';
    providerId?: string;
    avatarUrl?: string;
  };
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private configService: ConfigService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'mypos_secret_key_2026'),
    });
  }
  async validate(payload: JwtPayload) {
    // ✅ Nếu là tempToken (local flow), user chưa có trong DB → cho qua
    if ((payload as any).pendingUserData) {
      return {
        _id: payload.sub,
        username: payload.username,
        role: payload.role,
        shopId: null,
        businessTypes: payload.businessTypes ?? '',
        pendingUserData: (payload as any).pendingUserData,
      };
    }

    // Flow bình thường: check DB
    const user = await this.userModel.findById(payload.sub).lean();
    if (!user) throw new UnauthorizedException('User không tồn tại');
    if (user.isLocked) throw new UnauthorizedException('Tài khoản đã bị khóa');
    if (!user.isActive) throw new UnauthorizedException('Tài khoản không hoạt động');
    return { ...user, sub: String(user._id) };
  }
}
