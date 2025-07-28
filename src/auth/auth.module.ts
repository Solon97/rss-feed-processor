import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { EmailModule } from '../email/email.module';
import { AppAuthGuard } from './guards/auth.guard';
import { QStashSchedulerGuard } from './guards/qstash-scheduler.guard';
import { SupabaseJwtStrategy } from './strategies/supabase-jwt.strategy';

@Module({
  imports: [
    PassportModule,
    ConfigModule,
    EmailModule,
    JwtModule.register({
      signOptions: { expiresIn: '1h' },
    }),
  ],
  controllers: [AuthController],
  providers: [
    SupabaseJwtStrategy,
    AuthService,
    AppAuthGuard,
    QStashSchedulerGuard,
  ],
  exports: [AuthService, AppAuthGuard, QStashSchedulerGuard],
})
export class AuthModule {}
