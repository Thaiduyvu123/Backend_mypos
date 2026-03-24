import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ExecutionContext } from '@nestjs/common';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest(err, user, info) {
    console.log('🔍 JwtAuthGuard Debug:');
    console.log('  - err:', err);
    console.log('  - user:', user);
    console.log('  - info:', info);

    if (err || !user) {
      throw (
        err ||
        new UnauthorizedException('Token không hợp lệ hoặc không được cung cấp')
      );
    }
    return user;
  }
}