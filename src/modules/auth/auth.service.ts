import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt'; // Sửa cách import bcrypt
import { JwtService } from '@nestjs/jwt';
import { v4 as uuidv4 } from 'uuid';

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

    // 1. Check nhanh xem user tồn tại chưa
    const existingUser = await this.userModel
      .findOne({ username })
      .lean()
      .exec();
    if (existingUser) {
      throw new ConflictException('Username already exists');
    }

    // 2. Hash password
    const saltOrRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltOrRounds);

    try {
      const newUser = await this.userModel.create({
        _id: `user_${uuidv4()}`,
        shopId,
        username,
        passwordHash: hashedPassword,
        fullName,
        role: 'staff',
      });

      // 3. Trả về data sạch (không kèm passwordHash)
      const userObj = newUser.toObject();
      delete userObj.passwordHash;
      return userObj;
    } catch (error) {
      if (error.code === 11000) {
        throw new ConflictException('Username or Unique field already exists');
      }
      throw new InternalServerErrorException('Error creating user');
    }
  }

  async login(
    username: string,
    password: string,
  ): Promise<{ access_token: string }> {
    // 1. Tìm user
    const user = await this.userModel.findOne({ username }).lean().exec();

    // 2. Nếu không thấy user, ném lỗi ngay
    if (!user) {
      throw new UnauthorizedException('Invalid username or password');
    }

    // 3. So sánh mật khẩu
    // Đảm bảo user cast đúng kiểu hoặc dùng 'as any' nếu lười định nghĩa interface cho lean object
    const isMatch = await bcrypt.compare(password, (user as any).passwordHash);

    // FIX LỖI Ở ĐÂY: Nếu KHÔNG khớp (!) thì mới ném lỗi
    if (!isMatch) {
      throw new UnauthorizedException('Invalid username or password');
    }

    // 4. Tạo payload
    const payload = {
      sub: user._id,
      username: user.username,
      role: (user as any).role,
      shopId: (user as any).shopId,
    };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
