import { Controller, Get, Param } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('login')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get(':username/:password')
  async login(
    @Param('username') username: string,
    @Param('password') password: string,
  ) {
    return this.authService.login(username, password);
  }
}
