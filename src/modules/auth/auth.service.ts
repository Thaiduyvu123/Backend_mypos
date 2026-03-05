import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
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

    const hashedPassword: string = await bcrypt.hash(password, 10);

    try {
      const newUser = await this.userModel.create({
        _id: `user_${randomUUID()}`,
        shopId,
        username,
        passwordHash: hashedPassword,
        fullName,
        role: 'staff',
      });

      const { passwordHash, ...userObj } = newUser.toObject();
      void passwordHash;
      return userObj;
    } catch (error) {
      const mongoError = error as { code?: number };
      if (mongoError.code === 11000) {
        throw new ConflictException('Username or Unique field already exists');
      }
      throw new InternalServerErrorException('Error creating user');
    }
  }

  // ✅ Sửa lại hàm login
  async login(
    username: string,
    password: string,
  ): Promise<{ success: boolean; message: string; access_token?: string }> {
    // 1. Lấy user từ DB theo username
    const user = await this.userModel.findOne({ username }).lean().exec();

    if (!user) {
      return {
        success: false,
        message: 'Sai mật khẩu hoặc tài khoản không tồn tại',
      };
    }

    // 2. So sánh password với passwordHash trong DB
    const isMatch: boolean = await bcrypt.compare(password, user.passwordHash);

    // 3. Trả kết quả JSON
    if (!isMatch) {
      return {
        success: false,
        message: 'Sai mật khẩu',
      };
    }

    const payload = {
      sub: user._id,
      username: user.username,
      role: user.role,
      shopId: user.shopId,
    };

    return {
      success: true,
      message: 'Đăng nhập thành công',
      access_token: this.jwtService.sign(payload),
    };
  }
}
