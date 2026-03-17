import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }

  // ✅ OTP xác thực email khi đăng ký
  async sendRegisterOtp(email: string, otpCode: string): Promise<boolean> {
    return this.sendOtpEmail(email, otpCode, {
      subject: 'Xác thực email đăng ký myPOS',
      title: 'Xác thực Email',
      description: 'Nhập mã OTP này để xác thực email và hoàn tất đăng ký:',
      note: 'Nếu bạn không đăng ký tài khoản myPOS, hãy bỏ qua email này.',
    });
  }

  // ✅ OTP quên mật khẩu
  async sendOtp(email: string, otpCode: string): Promise<boolean> {
    return this.sendOtpEmail(email, otpCode, {
      subject: 'Mã OTP đặt lại mật khẩu myPOS',
      title: 'Đặt lại mật khẩu',
      description: 'Nhập mã OTP này để đặt lại mật khẩu:',
      note: 'Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.',
    });
  }

  // ============================================================
  // HELPER: Template email chung
  // ============================================================
  private async sendOtpEmail(
    email: string,
    otpCode: string,
    options: {
      subject: string;
      title: string;
      description: string;
      note: string;
    },
  ): Promise<boolean> {
    try {
      await this.transporter.sendMail({
        from: `"myPOS" <${process.env.GMAIL_USER}>`,
        to: email,
        subject: options.subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 24px;">
            <h2 style="color: #1F2937;">${options.title}</h2>
            <p style="color: #4B5563;">${options.description}</p>
            <div style="
              font-size: 36px;
              font-weight: bold;
              letter-spacing: 10px;
              color: #4F46E5;
              background: #EEF2FF;
              padding: 20px 24px;
              border-radius: 12px;
              text-align: center;
              margin: 24px 0;
              border: 2px dashed #C7D2FE;
            ">
              ${otpCode}
            </div>
            <p style="color: #6B7280;">
              Mã có hiệu lực trong <strong>5 phút</strong>.
            </p>
            <p style="color: #9CA3AF; font-size: 13px;">${options.note}</p>
            <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;" />
            <p style="color: #9CA3AF; font-size: 12px; text-align: center;">
              myPOS - Hệ thống quản lý bán hàng
            </p>
          </div>
        `,
      });

      this.logger.log(`✅ Đã gửi OTP tới ${email}`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Lỗi gửi email: ${(error as Error).message}`);
      return false;
    }
  }
}
