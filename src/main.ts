import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  
  const apiPrefix = configService.get('API_PREFIX') || '/api/v1';
  const corsOrigin = configService.get('CORS_ORIGIN')?.split(',') || ['http://localhost:5173', 'http://localhost:5174'];
  
  app.setGlobalPrefix(apiPrefix);
  app.use(helmet());
  app.use(compression());
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }));
  
  const port = configService.get('PORT') || 4000;
  await app.listen(port);
  console.log(`🚀 MotoSync API running on: http://localhost:${port}${apiPrefix}`);
}
bootstrap();
