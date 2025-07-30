import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { EmailTemplateType } from './templates';

export interface TemplateVariables {
  userName?: string;
  logoUrl?: string;
  dashboardUrl?: string;
  helpUrl?: string;
  accountUrl?: string;
  unsubscribeUrl?: string;
  supportEmail?: string;
  resetUrl?: string;
  subscriptionType?: string;
  [key: string]: any;
}

@Injectable()
export class EmailTemplateService {
  private readonly templatesPath: string;
  private readonly defaultVariables: TemplateVariables;
  constructor(private readonly configService: ConfigService) {
    const isProduction = process.env.NODE_ENV === 'production';
    this.templatesPath = isProduction
      ? path.join(process.cwd(), 'dist', 'email', 'templates', 'html')
      : path.join(process.cwd(), 'src', 'email', 'templates', 'html');

    this.defaultVariables = this.getDefaultTemplateVariables();
  }

  /**
   * Processes a template file with variables
   */
  processTemplate<T>(
    templateName: EmailTemplateType,
    customVariables: T,
  ): string {
    try {
      const variables = { ...this.defaultVariables, ...customVariables };

      const templatePath = path.join(
        this.templatesPath,
        `${templateName}.html`,
      );

      console.log(`Processing template: ${templatePath}`);
      console.log(`Template exists: ${fs.existsSync(templatePath)}`);

      if (!fs.existsSync(templatePath)) {
        throw new Error(`Template file not found: ${templatePath}`);
      }

      let template = fs.readFileSync(templatePath, 'utf-8');

      // Replace template variables
      Object.entries(variables).forEach(([key, value]) => {
        const placeholder = `{{${key}}}`;
        template = template.replace(new RegExp(placeholder, 'g'), value || '');
      });

      return template;
    } catch (error) {
      console.error(`Template processing failed:`, {
        templateName,
        templatesPath: this.templatesPath,
        error: error.message,
      });
      throw new Error(
        `Failed to process template ${templateName}: ${error.message}`,
      );
    }
  }

  /**
   * Generates HTML content for welcome email using template
   */
  private getDefaultTemplateVariables(): TemplateVariables {
    return {
      logoUrl: this.getLogoUrl(),
      dashboardUrl: this.getDashboardUrl(),
      helpUrl: this.getHelpUrl(),
      accountUrl: this.getAccountUrl(),
      unsubscribeUrl: this.getUnsubscribeUrl(),
      supportEmail: this.getSupportEmail(),
    };
  }

  private getDashboardUrl(): string {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    return `${frontendUrl}`;
  }

  private getHelpUrl(): string {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    return `${frontendUrl}/help`;
  }

  private getAccountUrl(): string {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    return `${frontendUrl}/account`;
  }

  private getUnsubscribeUrl(): string {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    return `${frontendUrl}/unsubscribe`;
  }

  private getSupportEmail(): string {
    return (
      this.configService.get<string>('SUPPORT_EMAIL') || 'support@feedagg.com'
    );
  }

  private getLogoUrl(): string {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';

    return `${frontendUrl}/funnel-icon.webp`;
  }
}
