import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  EmailProvider,
  SendEmailRequest,
  EmailSendResult,
} from './interfaces/email.interface';
import { EmailTemplateService } from './email-template.service';
import { ResendEmailProvider } from './resend-email.provider';
import { EmailTemplateType } from './templates';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly emailProvider: EmailProvider;

  constructor(
    private readonly configService: ConfigService,
    private readonly emailTemplateService: EmailTemplateService,
  ) {
    // For now, we only support Resend, but this can be extended to support multiple providers
    this.emailProvider = new ResendEmailProvider(configService);
  }

  /**
   * Sends a welcome email to a new user
   */
  async sendWelcomeEmail(
    userEmail: string,
    userName?: string,
  ): Promise<EmailSendResult> {
    const fromEmail = this.getFromEmailAddress();

    return this.emailProvider.sendEmail({
      from: fromEmail,
      to: userName ? { email: userEmail, name: userName } : userEmail,
      subject: 'Welcome to FeedAgg!',
      html: this.emailTemplateService.processTemplate(
        EmailTemplateType.WELCOME,
        {
          userName: userName || 'there',
        },
      ),
    });
  }

  /**
   * Sends a password reset email
   */
  async sendPasswordResetEmail(
    userEmail: string,
    resetToken: string,
    userName?: string,
  ): Promise<EmailSendResult> {
    const fromEmail = this.getFromEmailAddress();
    const resetUrl = `${this.configService.get('FRONTEND_URL')}/reset-password?token=${resetToken}`;

    return this.emailProvider.sendEmail({
      from: fromEmail,
      to: userName ? { email: userEmail, name: userName } : userEmail,
      subject: 'Reset Your Password - FeedAgg',
      text: this.generatePasswordResetEmailText(
        userName || userEmail,
        resetUrl,
      ),
    });
  }

  /**
   * Sends a subscription confirmation email
   */
  async sendSubscriptionConfirmationEmail(
    userEmail: string,
    subscriptionType: string,
    userName?: string,
  ): Promise<EmailSendResult> {
    const fromEmail = this.getFromEmailAddress();

    return this.emailProvider.sendEmail({
      from: fromEmail,
      to: userName ? { email: userEmail, name: userName } : userEmail,
      subject: `${subscriptionType} Subscription Confirmed!`,
      text: this.generateSubscriptionConfirmationEmailText(
        userName || userEmail,
        subscriptionType,
      ),
    });
  }

  /**
   * Sends a generic email
   */
  async sendEmail(request: SendEmailRequest): Promise<EmailSendResult> {
    return this.emailProvider.sendEmail(request);
  }

  /**
   * Validates the email service configuration
   */
  async validateConfiguration(): Promise<boolean> {
    return this.emailProvider.validateConfiguration();
  }

  private getFromEmailAddress(): string {
    const fromEmail = this.configService.get<string>('RESEND_FROM_EMAIL');
    if (!fromEmail) {
      throw new Error('RESEND_FROM_EMAIL is required but not configured');
    }
    return fromEmail;
  }

  private generatePasswordResetEmailText(
    userName: string,
    resetUrl: string,
  ): string {
    return `
Redefinição de senha

Olá ${userName},

Você solicitou a redefinição de sua senha no RSS Feed Processor.

Acesse o link abaixo para redefinir sua senha:
${resetUrl}

Se você não solicitou esta redefinição, pode ignorar este email com segurança.

Este link expirará em 1 hora por motivos de segurança.

Equipe RSS Feed Processor
    `;
  }

  private generateSubscriptionConfirmationEmailText(
    userName: string,
    subscriptionType: string,
  ): string {
    return `
Assinatura confirmada!

Olá ${userName},

Sua assinatura ${subscriptionType} foi confirmada com sucesso!

Agora você tem acesso a todos os recursos premium do RSS Feed Processor:
- Feeds ilimitados
- Filtros avançados
- Notificações em tempo real
- Suporte prioritário

Obrigado por escolher o RSS Feed Processor!

Equipe RSS Feed Processor
    `;
  }
}
