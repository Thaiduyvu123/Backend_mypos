import {
  Injectable,
  ConflictException,
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
import { GeocodingService } from './geocoding.service';
 
@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(Shop.name)
    private readonly shopModel: Model<ShopDocument>,
    private readonly jwtService: JwtService,
    private readonly geocodingService: GeocodingService,
  ) {}
 
  // ============================================================
  // ĐĂNG KÝ LOCAL - BƯỚC 2
  // Chỉ validate và tạo tempToken (KHÔNG tạo user)
  // User sẽ được tạo ở bước 3 (setupShop)
  // ============================================================
  async registerLocal(dto: RegisterLocalDto): Promise<Record<string, unknown>> {
    const { verifiedToken, username, password, fullName, email, phone } = dto;
 
    // ✅ Bước 1: Xác thực verifiedToken
    let tokenPayload: { email: string; purpose: string };
    try {
      tokenPayload = this.jwtService.verify(verifiedToken);
    } catch {
      throw new BadRequestException(
        'Token xác thực email không hợp lệ hoặc đã hết hạn. Vui lòng xác thực lại.',
      );
    }
    if (tokenPayload.purpose !== 'email_verified') {
      throw new BadRequestException('Token không hợp lệ');
    }
 
    const verifiedEmail = tokenPayload.email;
 
    // ✅ Bước 2: Kiểm tra username (KHÔNG tạo user)
    const existingUser = await this.userModel
      .findOne({ username })
      .lean()
      .exec();
    if (existingUser) {
      throw new ConflictException('Username đã tồn tại');
    }
 
    // ✅ Bước 3: Kiểm tra email (KHÔNG tạo user)
    const existingEmail = await this.userModel
      .findOne({ email: verifiedEmail })
      .lean()
      .exec();
    if (existingEmail) {
      throw new ConflictException('Email đã được sử dụng');
    }
 
    // ✅ Bước 4: Hash password để lưu trong token
    const hashedPassword: string = password; // nhận hash từ frontend
    const userId = `user_${randomUUID()}`;
 
    // ✅ Bước 5: Tạo tempToken với thông tin lưu vào token
    // Thông tin này sẽ được dùng ở bước 3 (setupShop) để tạo user
    console.log('🔑 JWT_SECRET được dùng:', process.env.JWT_SECRET);
    console.log('🔑 Secret từ JwtService:', this.jwtService);
    const tempToken = this.jwtService.sign(
      {
        sub: userId,
        username,
        role: 'owner',
        shopId: null,
        // 🔑 LƯU THÔNG TIN CẦN DÙNG Ở BƯỚC 3 (setupShop)
        pendingUserData: {
          passwordHash: hashedPassword,
          fullName,
          email: verifiedEmail,
          phone: phone || null,
        },
      },
      { expiresIn: '1h' }, // Token có hiệu lực 1 giờ
    );
 
    return {
      success: true,
      message: 'Xác thực thành công. Vui lòng điền thông tin shop.',
      access_token: tempToken,
      shopSetupDone: false,
    };
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
 
    if (!user.passwordHash) {
      return { success: false, message: 'Tài khoản không có mật khẩu' };
    }
 
    const result = await bcrypt.compare(password, user.passwordHash);
    if (!result) {
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
  // ============================================================
  async registerGoogle(
    googleUser: GoogleUser,
  ): Promise<Record<string, unknown>> {
    const { providerId, fullName, email, avatarUrl } = googleUser;
 
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
  // GOOGLE TOKEN TỪ MOBILE/FE
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
  // SETUP SHOP - BƯỚC 3
  // TẠO USER + TẠO SHOP cùng lúc
  // ============================================================
  async setupShop(
    userId: string,
    dto: ShopSetupDto,
    // ✅ Lấy thông tin user từ token
    pendingUserData?: {
      passwordHash: string;
      fullName: string;
      email: string;
      phone: string | null;
    },
  ): Promise<Record<string, unknown>> {
    // ✅ Kiểm tra user đã tồn tại hay chưa
    let user = await this.userModel.findById(userId).lean().exec();
 
    // ✅ Nếu user chưa tồn tại → TẠO USER LẦN ĐẦU (chỉ khi là local, không phải Google)
    if (!user) {
      if (!pendingUserData) {
        throw new BadRequestException(
          'Thông tin người dùng không hợp lệ. Vui lòng đăng ký lại.',
        );
      }
 
      try {
        user = (
          await this.userModel.create({
            _id: userId,
            shopId: null,
            username: pendingUserData.email.split('@')[0], // Dùng phần trước @ của email làm username
            passwordHash: pendingUserData.passwordHash,
            fullName: pendingUserData.fullName,
            email: pendingUserData.email,
            phone: pendingUserData.phone || undefined,
            provider: 'local',
            role: 'owner',
            shopSetupDone: false,
          })
        ).toObject();
      } catch (error) {
        const mongoError = error as { code?: number };
        if (mongoError.code === 11000) {
          throw new ConflictException('Thông tin đã tồn tại');
        }
        throw new InternalServerErrorException('Lỗi tạo tài khoản');
      }
    } else if (user.shopSetupDone) {
      // ✅ Nếu user đã tồn tại và đã setup shop → báo lỗi
      throw new ConflictException('Shop đã được thiết lập rồi');
    }
 
    const shopId = `shop_${randomUUID()}`;
 
    try {
      // ✅ Lấy tọa độ từ địa chỉ
      const { lat, lng } = await this.geocodingService.getCoordinates(
        dto.address,
        dto.city,
        dto.country,
      );
 
      // ✅ Tạo shop
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
        lat,
        lng,
      });
 
      // ✅ Cập nhật user với shopId + shopSetupDone = true
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
 
      // ✅ Tạo token mới với shopId
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
  // LẤY THÔNG TIN USER (GET /auth/me)
  // ============================================================
  async getMe(
    userId: string,
    tokenPayload: any,
  ): Promise<Record<string, unknown>> {
    const user = await this.userModel.findById(userId).lean().exec();

    if (!user) {
      return {
        success: true,
        message: 'Tài khoản chưa hoàn tất setup shop',
        user: tokenPayload,
      };
    }

    const { passwordHash, ...userObj } = user as any;
    void passwordHash;

    return {
      success: true,
      user: userObj,
    };
  }

  // ============================================================
  // HELPER: Tạo JWT token
  // ============================================================
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