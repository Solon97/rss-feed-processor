import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailTemplateService } from './email-template.service';
import { EmailService } from './email.service';
import { ResendEmailProvider } from './resend-email.provider';

@Module({
  imports: [ConfigModule],
  providers: [EmailService, EmailTemplateService, ResendEmailProvider],
  exports: [EmailService],
})
export class EmailModule {}
