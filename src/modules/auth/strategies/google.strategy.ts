import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';

export interface GoogleUser {
  providerId: string;
  fullName: string;
  email: string;
  avatarUrl: string;
  provider: 'google';
  mode: 'login' | 'register';
}

@Injectable()
export class GoogleLoginStrategy extends PassportStrategy(
  Strategy,
  'google-login',
) {
  constructor() {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: process.env.GOOGLE_LOGIN_CALLBACK_URL!,
      scope: ['email', 'profile'],
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): void {
    const { id, displayName, emails, photos } = profile;
    done(null, {
      providerId: id,
      fullName: displayName,
      email: emails?.[0]?.value ?? '',
      avatarUrl: photos?.[0]?.value ?? '',
      provider: 'google',
      mode: 'login',
    } as GoogleUser);
  }
}

@Injectable()
export class GoogleRegisterStrategy extends PassportStrategy(
  Strategy,
  'google-register',
) {
  constructor() {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: process.env.GOOGLE_REGISTER_CALLBACK_URL!,
      scope: ['email', 'profile'],
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): void {
    const { id, displayName, emails, photos } = profile;
    done(null, {
      providerId: id,
      fullName: displayName,
      email: emails?.[0]?.value ?? '',
      avatarUrl: photos?.[0]?.value ?? '',
      provider: 'google',
      mode: 'register',
    } as GoogleUser);
  }
}
