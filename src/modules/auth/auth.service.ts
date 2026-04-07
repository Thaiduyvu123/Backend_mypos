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
import { RegisterLocalDto } from './dto/register-local.dto';
import { ShopSetupDto } from './dto/shop-setup.dto';
import { GoogleUser } from './strategies/google.strategy';
import { GeocodingService } from './geocoding.service';
import { EmailService } from './email.service';
import { Otp, OtpDocument } from './schemas/otp.schema';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(Shop.name)
    private readonly shopModel: Model<ShopDocument>,
    @InjectModel(Otp.name)
    private readonly otpModel: Model<OtpDocument>,
    private readonly jwtService: JwtService,
    private readonly geocodingService: GeocodingService,
    private readonly emailService: EmailService,
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
    const tempToken = this.jwtService.sign(
      {
        sub: userId,
        username,
        role: 'owner',
        shopId: null,
        // 🔑 LƯU THÔNG TIN CẦN DÙNG Ở BƯỚC 3 (setupShop)
        pendingUserData: {
          passwordHash: hashedPassword,
          username,
          fullName,
          email: verifiedEmail,
          phone: phone || undefined,
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

    const token = this.generateToken(user as unknown as Record<string, unknown>);

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
  async registerGoogle(googleUser: GoogleUser): Promise<Record<string, unknown>> {
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
        role: 'owner',
        shopSetupDone: false,
      });

      const { passwordHash, ...userObj } = newUser.toObject();
      void passwordHash;

      const tempToken = this.generateToken(newUser.toObject() as unknown as Record<string, unknown>);

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
      throw new NotFoundException(
        'Tài khoản chưa tồn tại. Vui lòng đăng ký.',
      );
    }

    const token = this.generateToken(user as unknown as Record<string, unknown>);
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
  pendingUserData?: {
    passwordHash: string;
    username: string;
    fullName: string;
    email: string;
    phone?: string;
  },
): Promise<Record<string, unknown>> {
  const shopId = `shop_${randomUUID()}`;

  try {
    const { lat, lng } = await this.geocodingService.getCoordinates(
      dto.address,
      dto.city,
      dto.country,
    );

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

    let updatedUser;

    if (pendingUserData) {
      // ✅ LOCAL FLOW: Tạo user thật lần đầu tiên
      await this.userModel.create({
        _id: userId,
        shopId,
        username: pendingUserData.username,
        passwordHash: pendingUserData.passwordHash,
        fullName: pendingUserData.fullName,
        email: pendingUserData.email,
        phone: pendingUserData.phone ?? undefined,
        provider: 'local',
        role: 'owner',
        shopSetupDone: true,
        businessType: dto.businessType,
      });
      updatedUser = await this.userModel.findById(userId).lean().exec();
    } else {
      // ✅ GOOGLE FLOW: User đã có, chỉ update
      const existingUser = await this.userModel.findById(userId).lean().exec();
      if (!existingUser) throw new NotFoundException('Không tìm thấy user');
      if (existingUser.shopSetupDone) throw new ConflictException('Shop đã được thiết lập rồi');

      updatedUser = await this.userModel
        .findByIdAndUpdate(userId, { shopId, shopSetupDone: true, businessType: dto.businessType }, { new: true })
        .lean()
        .exec();
    }

    if (!updatedUser) throw new InternalServerErrorException('Lỗi cập nhật user');

    const { passwordHash, ...userObj } = updatedUser;
    void passwordHash;

    const newToken = this.generateToken(updatedUser as unknown as Record<string, unknown>);

    return {
      success: true,
      message: 'Thiết lập shop thành công',
      access_token: newToken,
      user: userObj,
      shop: newShop.toObject(),
    };
  } catch (error) {
    const mongoError = error as { code?: number };
    if (mongoError.code === 11000) throw new ConflictException('Thông tin shop đã tồn tại');
    throw new InternalServerErrorException('Lỗi tạo shop');
  }
}

  // ============================================================
  // GỬI OTP ĐỔI MẬT KHẨU
  // POST /api/auth/send-otp-change-password
  // ============================================================
  async sendOtpChangePassword(
    username: string,
    email: string,
  ): Promise<Record<string, unknown>> {
    const user = await this.userModel.findOne({ username, email }).lean().exec();
    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản');
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await this.otpModel.deleteMany({ email, isUsed: false, purpose: 'change_password' });
    await this.otpModel.create({
      _id: `otp_${randomUUID()}`,
      email,
      otpCode,
      expiresAt,
      isUsed: false,
      attempts: 0,
      purpose: 'change_password',
    });

    await this.emailService.sendRegisterOtp(email, otpCode);

    return {
      success: true,
      message: `Mã OTP đã gửi tới ${email}. Có hiệu lực 5 phút`,
    };
  }

  // ============================================================
  // ĐỔI MẬT KHẨU (có OTP xác nhận)
  // POST /api/auth/change-password
  // ============================================================
  async changePassword(
    username: string,
    email: string,
    otpCode: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<Record<string, unknown>> {
    const user = await this.userModel.findOne({ username, email }).lean().exec();
    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản');
    }

    const otp = await this.otpModel
      .findOne({ email, isUsed: false, purpose: 'change_password' })
      .sort({ createdAt: -1 })
      .exec();

    if (!otp) {
      throw new BadRequestException('OTP không hợp lệ hoặc đã hết hạn');
    }
    if (new Date() > otp.expiresAt) {
      await this.otpModel.findByIdAndDelete(otp._id);
      throw new BadRequestException('OTP đã hết hạn. Vui lòng yêu cầu mã mới');
    }
    if (otp.attempts >= 5) {
      await this.otpModel.findByIdAndDelete(otp._id);
      throw new BadRequestException('Nhập sai quá nhiều lần. Vui lòng yêu cầu OTP mới');
    }
    if (otp.otpCode !== otpCode) {
      await this.otpModel.findByIdAndUpdate(otp._id, { $inc: { attempts: 1 } });
      throw new BadRequestException(`OTP không đúng. Còn ${5 - otp.attempts - 1} lần thử`);
    }

    if (!user.passwordHash) {
      throw new BadRequestException('Tài khoản không có mật khẩu');
    }
    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.passwordHash as string);
    if (!isOldPasswordValid) {
      throw new BadRequestException('Mật khẩu cũ không đúng');
    }

    await this.otpModel.findByIdAndUpdate(otp._id, { isUsed: true });
    await this.userModel.findByIdAndUpdate(user._id, { passwordHash: newPassword });

    return {
      success: true,
      message: 'Đổi mật khẩu thành công',
    };
  }

  // ============================================================
  // QUÊN MẬT KHẨU - BƯỚC 1: Gửi OTP
  // Tìm user theo username HOẶC email rồi gửi OTP
  // ============================================================
  async sendOtpForgotPassword(
    usernameOrEmail: string,
  ): Promise<Record<string, unknown>> {
    const user = await this.userModel.findOne({
      $or: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
    }).lean().exec();

    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản');
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await this.otpModel.deleteMany({ email: user.email, isUsed: false, purpose: 'forgot_password' });
    await this.otpModel.create({
      _id: `otp_${randomUUID()}`,
      email: user.email,
      otpCode,
      expiresAt,
      isUsed: false,
      attempts: 0,
      purpose: 'forgot_password',
    });

    await this.emailService.sendRegisterOtp(user.email, otpCode);

    return {
      success: true,
      message: `Mã OTP đã gửi tới email. Có hiệu lực 5 phút`,
      email: user.email,
      username: user.username,
    };
  }

  // ============================================================
  // QUÊN MẬT KHẨU - BƯỚC 2: Xác thực OTP
  // Chỉ kiểm tra OTP, không đổi mật khẩu
  // ============================================================
  async verifyOtpForgotPassword(
    username: string,
    email: string,
    otpCode: string,
  ): Promise<Record<string, unknown>> {
    const user = await this.userModel.findOne({ username, email }).lean().exec();
    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản');
    }

    const otp = await this.otpModel
      .findOne({ email, isUsed: false, purpose: 'forgot_password' })
      .sort({ createdAt: -1 })
      .exec();

    if (!otp) throw new BadRequestException('OTP không hợp lệ hoặc đã hết hạn');
    if (new Date() > otp.expiresAt) {
      await this.otpModel.findByIdAndDelete(otp._id);
      throw new BadRequestException('OTP đã hết hạn. Vui lòng yêu cầu mã mới');
    }
    if (otp.attempts >= 5) {
      await this.otpModel.findByIdAndDelete(otp._id);
      throw new BadRequestException('Nhập sai quá nhiều lần. Vui lòng yêu cầu OTP mới');
    }
    if (otp.otpCode !== otpCode) {
      await this.otpModel.findByIdAndUpdate(otp._id, { $inc: { attempts: 1 } });
      throw new BadRequestException(`OTP không đúng. Còn ${5 - otp.attempts - 1} lần thử`);
    }

    // OTP đúng nhưng chưa đánh dấu isUsed — chờ bước 3 mới đánh dấu
    return {
      success: true,
      message: 'OTP hợp lệ. Vui lòng nhập mật khẩu mới',
    };
  }

  // ============================================================
  // QUÊN MẬT KHẨU - BƯỚC 3: Đặt lại mật khẩu
  // Xác thực OTP rồi cập nhật mật khẩu mới (không cần mật khẩu cũ)
  // ============================================================
  async forgotPassword(
    username: string,
    email: string,
    otpCode: string,
    newPassword: string,
  ): Promise<Record<string, unknown>> {
    const user = await this.userModel.findOne({ username, email }).lean().exec();
    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản');
    }

    const otp = await this.otpModel
      .findOne({ email, isUsed: false, purpose: 'forgot_password' })
      .sort({ createdAt: -1 })
      .exec();

    if (!otp) throw new BadRequestException('OTP không hợp lệ hoặc đã hết hạn');
    if (new Date() > otp.expiresAt) {
      await this.otpModel.findByIdAndDelete(otp._id);
      throw new BadRequestException('OTP đã hết hạn. Vui lòng yêu cầu mã mới');
    }
    if (otp.attempts >= 5) {
      await this.otpModel.findByIdAndDelete(otp._id);
      throw new BadRequestException('Nhập sai quá nhiều lần. Vui lòng yêu cầu OTP mới');
    }
    if (otp.otpCode !== otpCode) {
      await this.otpModel.findByIdAndUpdate(otp._id, { $inc: { attempts: 1 } });
      throw new BadRequestException(`OTP không đúng. Còn ${5 - otp.attempts - 1} lần thử`);
    }

    await this.otpModel.findByIdAndUpdate(otp._id, { isUsed: true });
    await this.userModel.findByIdAndUpdate(user._id, { passwordHash: newPassword });

    return {
      success: true,
      message: 'Đặt lại mật khẩu thành công',
    };
  }

  // ============================================================
  // ĐỔI MẬT KHẨU - BƯỚC 1: Xác minh username + mật khẩu cũ
  // ============================================================
  async verifyOldPassword(
    username: string,
    oldPassword: string,
  ): Promise<Record<string, unknown>> {
    const user = await this.userModel.findOne({ username }).lean().exec();
    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản');
    }
    if (!user.passwordHash) {
      throw new BadRequestException('Tài khoản không có mật khẩu');
    }
    const isValid = await bcrypt.compare(oldPassword, user.passwordHash as string);
    if (!isValid) {
      throw new BadRequestException('Mật khẩu cũ không đúng');
    }
    return { success: true, message: 'Xác minh thành công' };
  }

  // ============================================================
  // ĐỔI MẬT KHẨU - BƯỚC 2: Đổi mật khẩu trực tiếp (không cần OTP)
  // ============================================================
  async changePasswordDirect(
    username: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<Record<string, unknown>> {
    const user = await this.userModel.findOne({ username }).lean().exec();
    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản');
    }
    if (!user.passwordHash) {
      throw new BadRequestException('Tài khoản không có mật khẩu');
    }
    const isValid = await bcrypt.compare(oldPassword, user.passwordHash as string);
    if (!isValid) {
      throw new BadRequestException('Mật khẩu cũ không đúng');
    }
    await this.userModel.findByIdAndUpdate(user._id, { passwordHash: newPassword });
    return { success: true, message: 'Đổi mật khẩu thành công' };
  }

  // ============================================================
  // HELPER: Tạo JWT token
  // ============================================================
  private generateToken(user: Record<string, unknown>): string {
    const rawTypes = (user['businessType'] as string[] | undefined) ?? [];
    const businessTypes = rawTypes.join(','); // "rental,sale" | "rental" | "sale" | ""

    return this.jwtService.sign({
      sub: user['_id'],
      username: user['username'],
      role: user['role'],
      shopId: user['shopId'] ?? null,
      businessTypes,
    });
  }
}
