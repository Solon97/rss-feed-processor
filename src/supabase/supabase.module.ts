import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseController } from './supabase.controller';
import { SupabaseEmailHookService } from './supabase-email-hook.service';
import { EmailModule } from '../email/email.module';
@Module({
  imports: [ConfigModule, EmailModule],
  controllers: [SupabaseController],
  providers: [SupabaseEmailHookService],
})
export class SupabaseModule {}
