import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { validateEnvironment } from './common/config/env-validation';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  validateEnvironment();

  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Security middleware
  app.use(helmet());

  // CORS configuration
  app.enableCors({
    origin: configService.get<string>('FRONTEND_URL', 'http://localhost:5173'),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // API versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
    prefix: 'api/v',
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Swagger documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('TPL Expense API')
    .setDescription('Expense & Receipt Automation System API')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Auth', 'Authentication endpoints')
    .addTag('Users', 'User management endpoints')
    .addTag('Expenses', 'Expense management endpoints')
    .addTag('Receipts', 'Receipt upload and OCR endpoints')
    .addTag('Approvals', 'Approval workflow endpoints')
    .addTag('Vouchers', 'Petty cash voucher endpoints')
    .addTag('Budgets', 'Budget management endpoints')
    .addTag('Reports', 'Reporting endpoints')
    .addTag('Admin', 'Admin configuration endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);

  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 Swagger documentation: http://localhost:${port}/api/docs`);
}

process.on('unhandledRejection', (reason: unknown) => {
  const logger = new Logger('Process');
  logger.error('Unhandled Rejection', reason instanceof Error ? reason.stack : String(reason));
  process.exit(1);
});

process.on('uncaughtException', (error: Error) => {
  const logger = new Logger('Process');
  logger.error('Uncaught Exception', error.stack);
  process.exit(1);
});

bootstrap();
