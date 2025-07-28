import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './email.service';
import { EmailTemplateService } from './email-template.service';
import { ResendEmailProvider } from './resend-email.provider';
import { EmailController } from './email.controller';

@Module({
  imports: [ConfigModule],
  controllers: [EmailController],
  providers: [EmailService, EmailTemplateService, ResendEmailProvider],
  exports: [EmailService],
})
export class EmailModule {}
