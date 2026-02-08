import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('SMTP_HOST', 'localhost'),
      port: this.configService.get('SMTP_PORT', 1025),
      secure: this.configService.get('SMTP_SECURE', false),
      auth: this.configService.get('SMTP_USER')
        ? {
            user: this.configService.get('SMTP_USER'),
            pass: this.configService.get('SMTP_PASS'),
          }
        : undefined,
    });
  }

  private getAppUrl(): string {
    return this.configService.get('FRONTEND_URL', 'http://localhost:5173');
  }

  private escapeHtml(text: string): string {
    return text
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.configService.get('SMTP_FROM', 'noreply@tekcellent.com'),
        ...options,
      });
      this.logger.log(`Email sent to ${options.to}`);
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`);
      throw error;
    }
  }

  async sendExpenseSubmittedEmail(approver: any, expense: any) {
    await this.sendEmail({
      to: approver.email,
      subject: `[Action Required] New Expense Submitted - ${expense.expenseNumber}`,
      html: `
        <h2>New Expense Requires Your Approval</h2>
        <p><strong>Submitted by:</strong> ${this.escapeHtml(expense.submitter.firstName)} ${this.escapeHtml(expense.submitter.lastName)}</p>
        <p><strong>Expense Number:</strong> ${expense.expenseNumber}</p>
        <p><strong>Amount:</strong> ${expense.currency} ${expense.totalAmount}</p>
        <p><strong>Category:</strong> ${this.escapeHtml(expense.category?.name || 'N/A')}</p>
        <p><strong>Description:</strong> ${this.escapeHtml(expense.description)}</p>
        <br>
        <p>Please login to the Expense Management System to review and approve this expense.</p>
        <p><a href="${this.getAppUrl()}/approvals">View Pending Approvals</a></p>
      `,
    });
  }

  async sendExpenseApprovedEmail(submitter: any, expense: any) {
    await this.sendEmail({
      to: submitter.email,
      subject: `Expense Approved - ${expense.expenseNumber}`,
      html: `
        <h2>Your Expense Has Been Approved</h2>
        <p><strong>Expense Number:</strong> ${expense.expenseNumber}</p>
        <p><strong>Amount:</strong> ${expense.currency} ${expense.totalAmount}</p>
        <p><strong>Category:</strong> ${expense.category?.name || 'N/A'}</p>
        <br>
        <p>Your expense has been approved and will be processed for reimbursement.</p>
        <p><a href="${this.getAppUrl()}/expenses/${expense.id}">View Expense Details</a></p>
      `,
    });
  }

  async sendExpenseRejectedEmail(submitter: any, expense: any, reason: string) {
    await this.sendEmail({
      to: submitter.email,
      subject: `Expense Rejected - ${expense.expenseNumber}`,
      html: `
        <h2>Your Expense Has Been Rejected</h2>
        <p><strong>Expense Number:</strong> ${expense.expenseNumber}</p>
        <p><strong>Amount:</strong> ${expense.currency} ${expense.totalAmount}</p>
        <p><strong>Reason:</strong> ${this.escapeHtml(reason)}</p>
        <br>
        <p>Please review the feedback and make necessary corrections before resubmitting.</p>
        <p><a href="${this.getAppUrl()}/expenses/${expense.id}">View Expense Details</a></p>
      `,
    });
  }

  async sendPasswordResetEmail(user: any, resetToken: string) {
    const resetUrl = `${this.getAppUrl()}/reset-password?token=${resetToken}`;

    await this.sendEmail({
      to: user.email,
      subject: 'Password Reset Request',
      html: `
        <h2>Password Reset Request</h2>
        <p>Hello ${this.escapeHtml(user.firstName)},</p>
        <p>You requested to reset your password. Click the link below to set a new password:</p>
        <p><a href="${resetUrl}">Reset Password</a></p>
        <p>This link will expire in 1 hour.</p>
        <p>If you did not request this, please ignore this email.</p>
      `,
    });
  }
}
