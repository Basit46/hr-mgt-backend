import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface MailMessage {
  to: string;
  toName?: string;
  subject: string;
  text: string;
  html: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly configService: ConfigService) {}

  async send(message: MailMessage): Promise<void> {
    const apiKey = this.configService.get<string>('BREVO_API_KEY');
    if (!apiKey) {
      this.logger.warn(
        `BREVO_API_KEY not set. Email not sent to ${message.to}.`,
      );
      this.logger.warn(`Subject: ${message.subject} | Text: ${message.text}`);
      return;
    }

    const fromEmail = this.configService.get<string>(
      'BREVO_FROM_EMAIL',
      'no-reply@noemdekhrmgt.co.uk',
    );
    const fromName = this.configService.get<string>(
      'BREVO_FROM_NAME',
      'HR Mgt System',
    );

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { name: fromName, email: fromEmail },
        to: [{ email: message.to, name: message.toName ?? message.to }],
        subject: message.subject,
        htmlContent: message.html,
        textContent: message.text,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      this.logger.error(`Brevo request failed: ${response.status} ${detail}`);
      throw new ServiceUnavailableException('Failed to send email');
    }
  }
}
