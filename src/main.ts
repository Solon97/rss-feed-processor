import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const origin = process.env.NODE_ENV !== 'production' || [
    /^https:\/\/.*\.local-credentialless\.webcontainer-api\.io$/, // Para Bolt
    /^https:\/\/.*\.vercel\.app$/, // Para Vercel
    /^https:\/\/.*\.netlify\.app$/, // Para Netlify
    /^https:\/\/.*\.onrender\.com$/, // Para Render
  ];
  // Configuração de CORS
  app.enableCors({
    origin,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'Origin',
      'X-Requested-With',
      'Access-Control-Allow-Headers',
      'Access-Control-Allow-Origin',
      'Cache-Control',
    ],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  // Configuração global de validação
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.get(PrismaService);

  const port = process.env.PORT || 3001;
  await app.listen(port);
}
bootstrap();
