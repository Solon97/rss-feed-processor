import { Body, Controller, HttpCode, Logger, Post } from '@nestjs/common';
import { SupabaseEmailHookDto } from './dto/supabase-hook.dto';
import { SupabaseEmailHookService } from './supabase-email-hook.service';

@Controller('supabase')
export class SupabaseController {
  private readonly logger = new Logger(SupabaseController.name);

  constructor(
    private readonly supabaseEmailHookService: SupabaseEmailHookService,
  ) {}

  @Post('email-hook')
  @HttpCode(200)
  async handleSupabaseEmailHook(@Body() payload: SupabaseEmailHookDto) {
    try {
      this.logger.log('Received Supabase email hook');
      await this.supabaseEmailHookService.processEmailHook(payload);
    } catch (error) {
      this.logger.error('Failed to process Supabase email hook', error);

      // For webhook compatibility, we might want to return 200 even on errors
      // to prevent Supabase from retrying the webhook
      this.logger.warn('Returning 200 status to prevent webhook retries');
    }
  }
}
