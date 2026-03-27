import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

// Landing Page modules
import { AuthModule } from './modules/auth/auth.module';
import { DevicesModule } from './modules/devices/devices.module';
import { BusinessTypesModule } from './modules/business-types/business-types.module';

// Dashboard modules
import { AdminAuthModule } from './modules/admin-auth/admin-auth.module';
import { UsersModule } from './modules/users/users.module';
import { ShopsModule } from './modules/shops/shops.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { SyncModule } from './modules/sync/sync.module';

@Module({
  imports: [
    // ✅ Config
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),

    // ✅ MongoDB
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URI', 'mongodb://localhost:27017/my'),
        connectionFactory: (connection: any) => {
          connection.on('connected', () => console.log('✅ MongoDB connected'));
          connection.on('error', (err: any) => console.error('❌ MongoDB error:', err));
          return connection;
        },
      }),
      inject: [ConfigService],
    }),

    // ✅ Rate Limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get<number>('THROTTLE_TTL', 60) * 1000,
          limit: config.get<number>('THROTTLE_LIMIT', 100),
        },
      ],
      inject: [ConfigService],
    }),

    // ─── Landing Page ───────────────────────────────
    AuthModule, // /api/v1/auth/*  (register, login, google)
    DevicesModule,
    BusinessTypesModule, // /api/v1/business-types (public GET)

    // ─── Dashboard ──────────────────────────────────
    AdminAuthModule, // /api/v1/admin/auth/* (login/logout/profile)
    UsersModule, // /api/v1/users/*
    ShopsModule, // /api/v1/shops/*
    AuditLogsModule, // /api/v1/audit-logs/*  (@Global)
    SyncModule, // /api/v1/sync/*
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
