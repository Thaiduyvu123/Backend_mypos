import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt'; // ✅ Đổi lại import style
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';

import { User, UserDocument } from '../users/schemas/users.schema';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<any> {
    const { username, password, shopId, fullName } = dto;

    const existingUser = await this.userModel
      .findOne({ username })
      .lean()
      .exec();
    if (existingUser) {
      throw new ConflictException('Username already exists');
    }

    const hashedPassword: string = await bcrypt.hash(password, 10); // ✅ Explicit type

    try {
      const newUser = await this.userModel.create({
        _id: `user_${randomUUID()}`,
        shopId,
        username,
        passwordHash: hashedPassword,
        fullName,
        role: 'staff',
      });

      const { passwordHash, ...userObj } = newUser.toObject(); // ✅ Bỏ _password
      void passwordHash; // ✅ Báo TypeScript biết đây là intentional unused
      return userObj;
    } catch (error) {
      const mongoError = error as { code?: number };
      if (mongoError.code === 11000) {
        throw new ConflictException('Username or Unique field already exists');
      }
      throw new InternalServerErrorException('Error creating user');
    }
  }

  async login(
    username: string,
    password: string,
  ): Promise<{ access_token: string }> {
    const user = await this.userModel.findOne({ username }).lean().exec();

    if (!user) {
      throw new UnauthorizedException('Invalid username or password');
    }

    const isMatch: boolean = await bcrypt.compare(password, user.passwordHash); // ✅ Explicit type

    if (!isMatch) {
      throw new UnauthorizedException('Invalid username or password');
    }

    const payload = {
      sub: user._id,
      username: user.username,
      role: user.role,
      shopId: user.shopId,
    };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
