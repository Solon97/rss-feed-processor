import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { EnvironmentValidationService } from './config/environment-validation.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true, // Enable raw body parsing globally
  });

  // Validar variáveis de ambiente na inicialização
  const envValidationService = app.get(EnvironmentValidationService);
  const isEnvironmentValid = envValidationService.validateEnvironment();

  if (!isEnvironmentValid) {
    console.error('\n❌ Falha na validação das variáveis de ambiente!');
    console.error(
      '🔧 Configure as variáveis faltantes no arquivo .env e tente novamente.',
    );
    process.exit(1);
  }

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
  const host = '0.0.0.0';
  await app.listen(port, host);

  console.log(`Application is running on: http://${host}:${port}`);
}
bootstrap();
