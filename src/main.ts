import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.setGlobalPrefix('api'); // ✅ Thêm prefix /api
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  // ✅ Đảm bảo backend lắng nghe HOST 0.0.0.0 và PORT 3001 để LAN kết nối được
  await app.listen(process.env.PORT ?? 3001, '0.0.0.0');
}
bootstrap();
