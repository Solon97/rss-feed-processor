export interface EmailAddress {
  email: string;
  name?: string;
}

export interface EmailAttachment {
  filename: string;
  content: string | Buffer;
  contentType?: string;
}

export interface SendEmailRequest {
  from: string | EmailAddress;
  to: string | EmailAddress | Array<string | EmailAddress>;
  cc?: string | EmailAddress | Array<string | EmailAddress>;
  bcc?: string | EmailAddress | Array<string | EmailAddress>;
  subject: string;
  html?: string;
  text?: string;
  attachments?: EmailAttachment[];
  replyTo?: string | EmailAddress;
  tags?: Record<string, string>;
}

export interface EmailSendResult {
  id: string;
  success: boolean;
  message?: string;
}

export interface EmailProvider {
  sendEmail(request: SendEmailRequest): Promise<EmailSendResult>;
  validateConfiguration(): Promise<boolean>;
}
