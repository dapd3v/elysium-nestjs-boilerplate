import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailData } from './interfaces/mail-data.interface';
import { join } from 'path';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  
  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  async sendMail(
    mailData: MailData<{ hash: string }>,
    templateName: string, // El nombre de la plantilla
    subject: string, // El asunto del correo
    context: Record<string, unknown> // El contexto para la plantilla
  ): Promise<void> {
    const { to } = mailData;
    const templatePath = join(
      this.configService.getOrThrow('app.workingDirectory', {
        infer: true,
      }),
      'src',
      'core',
      'mail',
      'templates',
      `${templateName}.hbs`,
    ); 

    await this.mailerService.sendMail({
      to,
      subject,
      template: templatePath,
      context: {
        ...context,
        app_name: this.configService.get('app.name'),
      },
    });
  }

  async userSignUp(mailData: MailData<{ hash: string }>): Promise<void> {
    const url = new URL(
      this.configService.getOrThrow('app.frontendDomain') + '/confirm-email',
    );
    url.searchParams.set('hash', mailData.data.hash);

    await this.sendMail(
      mailData,
      'activation',
      'Verify Your Elysium Email Address',
      {
        url: url.toString(),
        title: 'Email Address Verification',
        actionTitle: 'Verify Email',
      },
    );
  }

  async forgotPassword(mailData: MailData<{ hash: string; tokenExpires: number }>): Promise<void> {
    const url = new URL(
      this.configService.getOrThrow('app.frontendDomain') + '/password-change',
    );
    url.searchParams.set('hash', mailData.data.hash);
    url.searchParams.set('expires', mailData.data.tokenExpires.toString());

    await this.sendMail(
      mailData, 
      'reset-password', 
      'Reset Your Password',
      {
        url: url.toString(),
        title: 'Reset Your Password',
        actionTitle: 'Reset Your Password',
      },
    );
  }

  async confirmNewEmail(mailData: MailData<{ hash: string }>): Promise<void> {
    const url = new URL(
      this.configService.getOrThrow('app.frontendDomain') + '/confirm-new-email',
    );
    url.searchParams.set('hash', mailData.data.hash);

    await this.sendMail(
      mailData,
      'confirm-new-email',
      'Confirm New Email Address',
      {
        url: url.toString(),
        title: 'Confirm New Email Address',
        actionTitle: 'Confirm Email Address',
      },
    );
  }

}
