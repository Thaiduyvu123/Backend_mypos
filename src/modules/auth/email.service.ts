import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    const gmailUser = process.env.GMAIL_USER;
    const gmailPassword = process.env.GMAIL_APP_PASSWORD;

    // Validate environment variables on initialization
    if (!gmailUser || !gmailPassword) {
      this.logger.error('❌ Missing Gmail credentials in .env file');
      this.logger.error(`GMAIL_USER: ${gmailUser ? '✓ Set' : '✗ Not set'}`);
      this.logger.error(`GMAIL_APP_PASSWORD: ${gmailPassword ? '✓ Set' : '✗ Not set'}`);
    }

    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPassword,
      },
    });

    // Test connection on initialization
    this.testConnection();
  }

  // Test Gmail connection
  private async testConnection(): Promise<void> {
    const isConnected = await this.verifyConnection();
    if (isConnected) {
      this.logger.log('✅ Gmail connection verified successfully');
    } else {
      this.logger.error('❌ Failed to verify Gmail connection');
      this.logger.error(
        'Please check your Gmail credentials and ensure:',
      );
      this.logger.error('1. GMAIL_USER is correct');
      this.logger.error('2. GMAIL_APP_PASSWORD is set (not regular password)');
      this.logger.error('3. 2-factor authentication is enabled');
      this.logger.error('4. App passwords are enabled in Google Account');
    }
  }

  // Public method to verify connection (used by diagnostic endpoint)
  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to verify Gmail connection: ${(error as Error).message}`,
      );
      return false;
    }
  }

  // ✅ OTP xác thực email khi đăng ký
  async sendRegisterOtp(email: string, otpCode: string): Promise<boolean> {
    return this.sendOtpEmail(email, otpCode, {
      subject: 'Xác thực email đăng ký My1POS',
      title: 'Xác thực Email',
      description: 'Nhập mã OTP này để xác thực email và hoàn tất đăng ký:',
      note: 'Nếu bạn không đăng ký tài khoản My1POS, hãy bỏ qua email này.',
    });
  }

  // ✅ OTP quên mật khẩu
  async sendOtp(email: string, otpCode: string): Promise<boolean> {
    return this.sendOtpEmail(email, otpCode, {
      subject: 'Mã OTP đặt lại mật khẩu My1POS',
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
      const mailOptions = {
        from: `"My1POS" <${process.env.GMAIL_USER}>`,
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
              My1POS - Hệ thống quản lý bán hàng
            </p>
          </div>
        `,
      };

      this.logger.debug(`Sending email to: ${email}`);
      const result = await this.transporter.sendMail(mailOptions);
      
      this.logger.log(`✅ Email sent successfully to ${email}`);
      this.logger.debug(`Message ID: ${result.messageId}`);
      return true;
    } catch (error) {
      const errorMessage = (error as Error).message;
      const errorCode = (error as any).code;
      const errorResponse = (error as any).response;

      this.logger.error(`❌ Failed to send email to ${email}`);
      this.logger.error(`Error: ${errorMessage}`);
      
      if (errorCode) {
        this.logger.error(`Error Code: ${errorCode}`);
      }

      if (errorResponse) {
        this.logger.error(`Error Response: ${errorResponse}`);
      }

      // Provide diagnostic hints
      if (errorMessage.includes('invalid login') || errorMessage.includes('535')) {
        this.logger.error('Hint: Invalid Gmail credentials. Check GMAIL_USER and GMAIL_APP_PASSWORD');
      } else if (errorMessage.includes('authenticate') || errorMessage.includes('credentials')) {
        this.logger.error('Hint: Authentication failed. Ensure app password is enabled in Google Account');
      } else if (errorMessage.includes('network') || errorMessage.includes('ECONNREFUSED')) {
        this.logger.error('Hint: Network error. Check your internet connection');
      }

      return false;
    }
  }
}
