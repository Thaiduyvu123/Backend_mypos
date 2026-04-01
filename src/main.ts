import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true }),
  );

  await app.register(require('@fastify/cors'), {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  const config = new DocumentBuilder()
    .setTitle('My1POS API')
    .setDescription('Landing Page + Dashboard API')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'JWT-auth',
    )
    .addTag('Auth - Landing', 'Đăng ký / Đăng nhập người dùng')
    .addTag('Auth - Dashboard', 'Đăng nhập admin dashboard')
    .addTag('Users', 'Quản lý người dùng')
    .addTag('Shops', 'Quản lý cửa hàng')
    .addTag('Devices', 'Quản lý thiết bị')
    .addTag('Business Types', 'Loại hình kinh doanh')
    .addTag('Audit Logs', 'Nhật ký hành động')
    .addTag('Sync', 'Đồng bộ dữ liệu offline')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 API:     http://localhost:${port}/api/v1`);
  console.log(`📖 Swagger: http://localhost:${port}/docs`);
}
bootstrap();