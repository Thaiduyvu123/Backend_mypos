import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProductsModule } from './modules/products/products.module';
import { OrdersModule } from './modules/orders/orders.module';
import { DevicesModule } from './modules/devices/devices.module';
import { BusinessTypesModule } from './modules/business-types/business-types.module';

@Module({
  imports: [
    // Load .env
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // ✅ Rate Limiting toàn cục
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000, // 1 phút
        limit: 60, // 60 request/phút cho các API thông thường
      },
    ]),
    // Kết nối MongoDB
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URI'),
      }),
    }),

    UsersModule,

    AuthModule,

    ProductsModule,

    OrdersModule,
    DevicesModule,
    BusinessTypesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // ✅ Áp dụng rate limit toàn cục
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
