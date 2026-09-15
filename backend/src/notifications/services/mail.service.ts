import { Injectable, Logger } from '@nestjs/common'

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name)

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    this.logger.log(`[DEV] Verification email sent to ${email} with token: ${token}`)
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    this.logger.log(`[DEV] Password reset email sent to ${email} with token: ${token}`)
  }

  async sendWelcomeEmail(email: string, firstName: string): Promise<void> {
    this.logger.log(`[DEV] Welcome email sent to ${email}`)
  }
}
