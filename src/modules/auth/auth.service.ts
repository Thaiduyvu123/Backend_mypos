import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';

import { User, UserDocument } from '../users/schemas/users.schema';
import { Shop, ShopDocument } from '../shops/schemas/shops.schema';
import { RegisterLocalDto } from 'src/modules/auth/dto/register-local.dto';
import { ShopSetupDto } from './dto/shop-setup.dto';
import { GoogleUser } from './strategies/google.strategy';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(Shop.name)
    private readonly shopModel: Model<ShopDocument>,
    private readonly jwtService: JwtService,
  ) {}

  // ============================================================
  // ĐĂNG KÝ LOCAL
  // Tạo user -> trả temp token -> FE gọi /shop/setup
  // ============================================================
  async registerLocal(dto: RegisterLocalDto): Promise<Record<string, unknown>> {
    const { username, password, fullName, email, phone } = dto;

    // Kiểm tra username
    const existingUser = await this.userModel
      .findOne({ username })
      .lean()
      .exec();
    if (existingUser) {
      throw new ConflictException('Username đã tồn tại');
    }

    // Kiểm tra email nếu có
    if (email) {
      const existingEmail = await this.userModel
        .findOne({ email })
        .lean()
        .exec();
      if (existingEmail) {
        throw new ConflictException('Email đã được sử dụng');
      }
    }

    const hashedPassword: string = await bcrypt.hash(password, 10);
    const userId = `user_${randomUUID()}`;

    try {
      const newUser = await this.userModel.create({
        _id: userId,
        shopId: null,
        username,
        passwordHash: hashedPassword,
        fullName,
        email,
        phone,
        provider: 'local',
        role: 'admin',
        shopSetupDone: false,
      });

      const { passwordHash, ...userObj } = newUser.toObject();
      void passwordHash;

      // Trả temp token (chưa có shopId)
      const tempToken = this.generateToken(newUser.toObject());

      return {
        success: true,
        message: 'Đăng ký thành công. Vui lòng điền thông tin shop.',
        access_token: tempToken,
        shopSetupDone: false,
        user: userObj,
      };
    } catch (error) {
      const mongoError = error as { code?: number };
      if (mongoError.code === 11000) {
        throw new ConflictException('Thông tin đã tồn tại');
      }
      throw new InternalServerErrorException('Lỗi tạo tài khoản');
    }
  }

  // ============================================================
  // ĐĂNG NHẬP LOCAL
  // ============================================================
  async loginLocal(
    username: string,
    password: string,
  ): Promise<Record<string, unknown>> {
    const user = await this.userModel.findOne({ username }).lean().exec();

    if (!user) {
      return { success: false, message: 'Tài khoản không tồn tại' };
    }

    if (user.provider !== 'local') {
      return {
        success: false,
        message: 'Tài khoản này đăng nhập bằng Google. Vui lòng dùng Google.',
      };
    }

    const isMatch: boolean = bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return { success: false, message: 'Sai mật khẩu' };
    }

    const token = this.generateToken(user);
    return {
      success: true,
      message: 'Đăng nhập thành công',
      access_token: token,
      shopSetupDone: user.shopSetupDone,
    };
  }

  // ============================================================
  // ĐĂNG KÝ GOOGLE
  // Nếu email đã tồn tại → báo lỗi yêu cầu đăng nhập
  // ============================================================
  async registerGoogle(
    googleUser: GoogleUser,
  ): Promise<Record<string, unknown>> {
    const { providerId, fullName, email, avatarUrl } = googleUser;

    // Kiểm tra email đã tồn tại chưa
    const existingUser = await this.userModel
      .findOne({ $or: [{ email }, { providerId }] })
      .lean()
      .exec();

    if (existingUser) {
      throw new ConflictException(
        'Email này đã được đăng ký. Vui lòng đăng nhập.',
      );
    }

    const userId = `user_${randomUUID()}`;

    try {
      const newUser = await this.userModel.create({
        _id: userId,
        shopId: null,
        username: `google_${providerId}`,
        passwordHash: null,
        fullName,
        email,
        avatarUrl,
        provider: 'google',
        providerId,
        role: 'admin',
        shopSetupDone: false,
      });

      const { passwordHash, ...userObj } = newUser.toObject();
      void passwordHash;

      const tempToken = this.generateToken(newUser.toObject());

      return {
        success: true,
        message: 'Đăng ký Google thành công. Vui lòng điền thông tin shop.',
        access_token: tempToken,
        shopSetupDone: false,
        user: userObj,
      };
    } catch (error) {
      const mongoError = error as { code?: number };
      if (mongoError.code === 11000) {
        throw new ConflictException('Tài khoản đã tồn tại');
      }
      throw new InternalServerErrorException('Lỗi tạo tài khoản Google');
    }
  }

  // ============================================================
  // ĐĂNG NHẬP GOOGLE
  // Nếu chưa có tài khoản → báo lỗi yêu cầu đăng ký
  // ============================================================
  async loginGoogle(googleUser: GoogleUser): Promise<Record<string, unknown>> {
    const { providerId, email } = googleUser;

    const user = await this.userModel
      .findOne({ $or: [{ providerId }, { email, provider: 'google' }] })
      .lean()
      .exec();

    if (!user) {
      throw new NotFoundException('Tài khoản chưa tồn tại. Vui lòng đăng ký.');
    }

    const token = this.generateToken(user);
    return {
      success: true,
      message: 'Đăng nhập Google thành công',
      access_token: token,
      shopSetupDone: user.shopSetupDone,
    };
  }

  // ============================================================
  // GOOGLE TOKEN TỪ MOBILE/FE (gửi idToken lên)
  // mode: 'login' | 'register'
  // ============================================================
  async googleWithToken(
    idToken: string,
    mode: 'login' | 'register',
  ): Promise<Record<string, unknown>> {
    const { OAuth2Client } = await import('google-auth-library');
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

    try {
      const ticket = await client.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload) throw new BadRequestException('Token không hợp lệ');

      const googleUser: GoogleUser = {
        providerId: payload.sub,
        fullName: payload.name ?? '',
        email: payload.email ?? '',
        avatarUrl: payload.picture ?? '',
        provider: 'google',
        mode,
      };

      if (mode === 'register') {
        return this.registerGoogle(googleUser);
      } else {
        return this.loginGoogle(googleUser);
      }
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException('Google token không hợp lệ');
    }
  }

  // ============================================================
  // SETUP SHOP (sau khi đăng ký)
  // Cần JWT token từ bước đăng ký
  // ============================================================
  async setupShop(
    userId: string,
    dto: ShopSetupDto,
  ): Promise<Record<string, unknown>> {
    // Kiểm tra user tồn tại và chưa setup shop
    const user = await this.userModel.findById(userId).lean().exec();
    if (!user) throw new NotFoundException('Không tìm thấy user');

    if (user.shopSetupDone) {
      throw new ConflictException('Shop đã được thiết lập rồi');
    }

    const shopId = `shop_${randomUUID()}`;

    try {
      // Tạo shop
      const newShop = await this.shopModel.create({
        _id: shopId,
        name: dto.name,
        ownerName: dto.ownerName,
        phone: dto.phone,
        email: dto.email,
        address: dto.address,
        city: dto.city,
        country: dto.country,
        businessType: dto.businessType,
        taxCode: dto.taxCode,
      });

      // Cập nhật user với shopId
      const updatedUser = await this.userModel
        .findByIdAndUpdate(
          userId,
          { shopId, shopSetupDone: true },
          { new: true },
        )
        .lean()
        .exec();

      if (!updatedUser)
        throw new InternalServerErrorException('Lỗi cập nhật user');

      const { passwordHash, ...userObj } = updatedUser;
      void passwordHash;

      // Tạo token mới với shopId
      const newToken = this.generateToken(updatedUser);

      return {
        success: true,
        message: 'Thiết lập shop thành công',
        access_token: newToken,
        user: userObj,
        shop: newShop.toObject(),
      };
    } catch (error) {
      const mongoError = error as { code?: number };
      if (mongoError.code === 11000) {
        throw new ConflictException('Thông tin shop đã tồn tại');
      }
      throw new InternalServerErrorException('Lỗi tạo shop');
    }
  }

  // ============================================================
  // HELPER: Tạo JWT token
  // ============================================================
  // ✅ Đổi kiểu generateToken nhận User document
  private generateToken(user: {
    _id: unknown;
    username: unknown;
    role: unknown;
    shopId: unknown;
  }): string {
    return this.jwtService.sign({
      sub: user._id,
      username: user.username,
      role: user.role,
      shopId: user.shopId ?? null,
    });
  }
}
