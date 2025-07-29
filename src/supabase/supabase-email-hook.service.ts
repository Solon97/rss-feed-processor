import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailActionType, SupabaseEmailHookDto } from './dto/supabase-hook.dto';
import { EmailService } from '../email/email.service';

@Injectable()
export class SupabaseEmailHookService {
  private readonly logger = new Logger(SupabaseEmailHookService.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  async processEmailHook(payload: SupabaseEmailHookDto): Promise<void> {
    const { email_data } = payload;

    this.logger.log(
      `Processing email hook for action: ${email_data.email_action_type}`,
    );

    switch (email_data.email_action_type) {
      case EmailActionType.SIGNUP:
        await this.handleSignupEmail(payload);
        break;

      case EmailActionType.RECOVERY:
        await this.handleRecoveryEmail(payload);
        break;

      case EmailActionType.EMAIL_CHANGE:
        await this.handleEmailChange(payload);
        break;

      default:
        return;
    }
  }

  private async handleSignupEmail(
    payload: SupabaseEmailHookDto,
  ): Promise<void> {
    this.logger.log('Processing signup email hook');

    try {
      const userEmail = payload.user?.user_metadata?.email;
      const userName = payload.user?.user_metadata?.name;
      const tokenHash = payload.email_data?.token_hash;
      const emailActionType = payload.email_data?.email_action_type;

      if (!userEmail) {
        this.logger.error('User email not found in payload');
        return;
      }

      if (!tokenHash || !emailActionType) {
        this.logger.error(
          'Token hash or email action type not found in payload',
        );
        return;
      }

      const confirmationUrl = `${this.configService.get<string>('WEBHOOK_BASE_URL')}/auth/confirm?token_hash=${tokenHash}&type=${emailActionType}`;

      this.logger.log(`Sending confirmation email to: ${userEmail}`);

      await this.emailService.sendConfirmationEmail(
        userEmail,
        confirmationUrl,
        userName,
      );

      this.logger.log('Confirmation email sent successfully');
    } catch (error) {
      this.logger.error('Failed to send confirmation email', error);
      throw error;
    }
  }

  private async handleEmailChange(
    payload: SupabaseEmailHookDto,
  ): Promise<void> {
    this.logger.log('Processing email change hook');
    console.log('Email change payload:', JSON.stringify(payload, null, 2));

    // TODO: Implement email change logic
    // This could include:
    // - Verification of both old and new email addresses
    // - Custom email change confirmation template
    // - User notification about email change attempt
  }

  private async handleRecoveryEmail(
    payload: SupabaseEmailHookDto,
  ): Promise<void> {
    this.logger.log('Processing recovery email hook');
    console.log('Recovery email payload:', JSON.stringify(payload, null, 2));

    // TODO: Implement recovery email logic
    // This could include:
    // - Custom password reset email template
    // - Security checks
    // - Rate limiting considerations
  }
}
