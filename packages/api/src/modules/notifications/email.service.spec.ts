import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';
import * as nodemailer from 'nodemailer';

jest.mock('nodemailer');

describe('EmailService', () => {
  let service: EmailService;

  const mockSendMail = jest.fn();
  const mockTransporter = { sendMail: mockSendMail };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: unknown) => {
      const config: Record<string, unknown> = {
        SMTP_HOST: 'test-smtp-host',
        SMTP_PORT: 587,
        SMTP_SECURE: false,
        SMTP_USER: undefined,
        SMTP_PASS: undefined,
        SMTP_FROM: 'test@tekcellent.com',
        FRONTEND_URL: 'https://expense.tekcellent.com',
      };
      return config[key] ?? defaultValue;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);
    mockSendMail.mockResolvedValue({ messageId: 'test-message-id' });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  describe('constructor', () => {
    it('should create transporter with config values', () => {
      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        host: 'test-smtp-host',
        port: 587,
        secure: false,
        auth: undefined,
      });
    });

    it('should configure auth when SMTP_USER is provided', async () => {
      jest.clearAllMocks();

      const configWithAuth = {
        get: jest.fn((key: string, defaultValue?: unknown) => {
          const config: Record<string, unknown> = {
            SMTP_HOST: 'test-smtp-host',
            SMTP_PORT: 587,
            SMTP_SECURE: true,
            SMTP_USER: 'smtp-user',
            SMTP_PASS: 'smtp-pass',
          };
          return config[key] ?? defaultValue;
        }),
      };

      (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);

      const authModule: TestingModule = await Test.createTestingModule({
        providers: [
          EmailService,
          { provide: ConfigService, useValue: configWithAuth },
        ],
      }).compile();

      authModule.get<EmailService>(EmailService);

      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        host: 'test-smtp-host',
        port: 587,
        secure: true,
        auth: {
          user: 'smtp-user',
          pass: 'smtp-pass',
        },
      });
    });
  });

  describe('sendEmail', () => {
    it('should send email via transporter with correct from address', async () => {
      const options = {
        to: 'recipient@tekcellent.com',
        subject: 'Test Subject',
        html: '<p>Test body</p>',
      };

      await service.sendEmail(options);

      expect(mockSendMail).toHaveBeenCalledWith({
        from: 'test@tekcellent.com',
        to: 'recipient@tekcellent.com',
        subject: 'Test Subject',
        html: '<p>Test body</p>',
      });
    });

    it('should send email to multiple recipients', async () => {
      const options = {
        to: ['user1@tekcellent.com', 'user2@tekcellent.com'],
        subject: 'Multi Recipient',
        html: '<p>Hello all</p>',
      };

      await service.sendEmail(options);

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ['user1@tekcellent.com', 'user2@tekcellent.com'],
        }),
      );
    });

    it('should throw error when transporter fails', async () => {
      const transportError = new Error('SMTP connection refused');
      mockSendMail.mockRejectedValue(transportError);

      const options = {
        to: 'recipient@tekcellent.com',
        subject: 'Test',
        html: '<p>Test</p>',
      };

      await expect(service.sendEmail(options)).rejects.toThrow('SMTP connection refused');
    });

    it('should include optional text field when provided', async () => {
      const options = {
        to: 'recipient@tekcellent.com',
        subject: 'Test Subject',
        html: '<p>HTML body</p>',
        text: 'Plain text body',
      };

      await service.sendEmail(options);

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'Plain text body',
        }),
      );
    });
  });

  describe('sendExpenseSubmittedEmail', () => {
    const mockApprover = {
      email: 'approver@tekcellent.com',
      firstName: 'John',
      lastName: 'Approver',
    };

    const mockExpense = {
      id: 'expense-id-123',
      expenseNumber: 'EXP-2026-001',
      totalAmount: '5000.00',
      currency: 'PKR',
      description: 'Business travel expenses',
      submitter: {
        firstName: 'Jane',
        lastName: 'Employee',
      },
      category: {
        name: 'Travel',
      },
    };

    it('should send email to approver with correct subject', async () => {
      await service.sendExpenseSubmittedEmail(mockApprover, mockExpense);

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'approver@tekcellent.com',
          subject: '[Action Required] New Expense Submitted - EXP-2026-001',
        }),
      );
    });

    it('should include expense details in HTML body', async () => {
      await service.sendExpenseSubmittedEmail(mockApprover, mockExpense);

      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('Jane');
      expect(callArgs.html).toContain('Employee');
      expect(callArgs.html).toContain('EXP-2026-001');
      expect(callArgs.html).toContain('PKR');
      expect(callArgs.html).toContain('5000.00');
      expect(callArgs.html).toContain('Travel');
      expect(callArgs.html).toContain('Business travel expenses');
    });

    it('should include approval link with correct URL', async () => {
      await service.sendExpenseSubmittedEmail(mockApprover, mockExpense);

      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('https://expense.tekcellent.com/approvals');
    });

    it('should escape submitter name to prevent HTML injection', async () => {
      const maliciousExpense = {
        ...mockExpense,
        submitter: {
          firstName: '<script>alert("xss")</script>',
          lastName: 'Test&Co',
        },
      };

      await service.sendExpenseSubmittedEmail(mockApprover, maliciousExpense);

      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
      expect(callArgs.html).toContain('Test&amp;Co');
      expect(callArgs.html).not.toContain('<script>');
    });

    it('should escape category name', async () => {
      const maliciousExpense = {
        ...mockExpense,
        category: { name: '<b>Fake</b> & "Evil"' },
      };

      await service.sendExpenseSubmittedEmail(mockApprover, maliciousExpense);

      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('&lt;b&gt;Fake&lt;/b&gt; &amp; &quot;Evil&quot;');
    });

    it('should escape description', async () => {
      const maliciousExpense = {
        ...mockExpense,
        description: 'Test <img src=x onerror="alert(1)">',
      };

      await service.sendExpenseSubmittedEmail(mockApprover, maliciousExpense);

      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
      expect(callArgs.html).not.toContain('<img');
    });

    it('should handle missing category gracefully', async () => {
      const expenseNoCategory = {
        ...mockExpense,
        category: null,
      };

      await service.sendExpenseSubmittedEmail(mockApprover, expenseNoCategory);

      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('N/A');
    });
  });

  describe('sendExpenseApprovedEmail', () => {
    const mockSubmitter = {
      email: 'employee@tekcellent.com',
      firstName: 'Jane',
      lastName: 'Employee',
    };

    const mockExpense = {
      id: 'expense-id-456',
      expenseNumber: 'EXP-2026-002',
      totalAmount: '12000.00',
      currency: 'PKR',
      category: {
        name: 'Office Supplies',
      },
    };

    it('should send approval notification to submitter', async () => {
      await service.sendExpenseApprovedEmail(mockSubmitter, mockExpense);

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'employee@tekcellent.com',
          subject: 'Expense Approved - EXP-2026-002',
        }),
      );
    });

    it('should include expense details in HTML body', async () => {
      await service.sendExpenseApprovedEmail(mockSubmitter, mockExpense);

      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('EXP-2026-002');
      expect(callArgs.html).toContain('PKR');
      expect(callArgs.html).toContain('12000.00');
      expect(callArgs.html).toContain('Office Supplies');
      expect(callArgs.html).toContain('approved');
    });

    it('should include expense details link with correct URL', async () => {
      await service.sendExpenseApprovedEmail(mockSubmitter, mockExpense);

      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).toContain(
        'https://expense.tekcellent.com/expenses/expense-id-456',
      );
    });

    it('should handle missing category gracefully', async () => {
      const expenseNoCategory = { ...mockExpense, category: null };

      await service.sendExpenseApprovedEmail(mockSubmitter, expenseNoCategory);

      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('N/A');
    });
  });

  describe('sendExpenseRejectedEmail', () => {
    const mockSubmitter = {
      email: 'employee@tekcellent.com',
      firstName: 'Jane',
      lastName: 'Employee',
    };

    const mockExpense = {
      id: 'expense-id-789',
      expenseNumber: 'EXP-2026-003',
      totalAmount: '3500.00',
      currency: 'PKR',
    };

    it('should send rejection email to submitter with reason', async () => {
      const reason = 'Missing receipts for hotel charges';

      await service.sendExpenseRejectedEmail(mockSubmitter, mockExpense, reason);

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'employee@tekcellent.com',
          subject: 'Expense Rejected - EXP-2026-003',
        }),
      );

      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('Missing receipts for hotel charges');
    });

    it('should include expense details in HTML body', async () => {
      await service.sendExpenseRejectedEmail(mockSubmitter, mockExpense, 'Invalid');

      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('EXP-2026-003');
      expect(callArgs.html).toContain('PKR');
      expect(callArgs.html).toContain('3500.00');
    });

    it('should include correct expense link', async () => {
      await service.sendExpenseRejectedEmail(mockSubmitter, mockExpense, 'Reason');

      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).toContain(
        'https://expense.tekcellent.com/expenses/expense-id-789',
      );
    });

    it('should escape rejection reason to prevent HTML injection', async () => {
      const maliciousReason = '<script>alert("xss")</script> & "bad" reason';

      await service.sendExpenseRejectedEmail(mockSubmitter, mockExpense, maliciousReason);

      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).toContain(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt; &amp; &quot;bad&quot; reason',
      );
      expect(callArgs.html).not.toContain('<script>');
    });
  });

  describe('sendPasswordResetEmail', () => {
    const mockUser = {
      email: 'user@tekcellent.com',
      firstName: 'Alice',
    };

    const resetToken = 'abc123-reset-token-xyz';

    it('should send email with reset URL containing token', async () => {
      await service.sendPasswordResetEmail(mockUser, resetToken);

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@tekcellent.com',
          subject: 'Password Reset Request',
        }),
      );

      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).toContain(
        'https://expense.tekcellent.com/reset-password?token=abc123-reset-token-xyz',
      );
    });

    it('should include greeting with user first name', async () => {
      await service.sendPasswordResetEmail(mockUser, resetToken);

      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('Hello Alice');
    });

    it('should include expiration notice', async () => {
      await service.sendPasswordResetEmail(mockUser, resetToken);

      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('expire in 1 hour');
    });

    it('should escape user firstName to prevent HTML injection', async () => {
      const maliciousUser = {
        email: 'user@tekcellent.com',
        firstName: '<img src=x onerror="steal()">',
      };

      await service.sendPasswordResetEmail(maliciousUser, resetToken);

      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).toContain(
        '&lt;img src=x onerror=&quot;steal()&quot;&gt;',
      );
      expect(callArgs.html).not.toContain('<img');
    });
  });

  describe('escapeHtml (tested via email methods)', () => {
    it('should escape ampersand characters', async () => {
      const expense = {
        id: 'id',
        expenseNumber: 'EXP-001',
        totalAmount: '100',
        currency: 'PKR',
        description: 'Tom & Jerry supplies',
        submitter: { firstName: 'A', lastName: 'B' },
        category: { name: 'General' },
      };

      await service.sendExpenseSubmittedEmail({ email: 'a@b.com' }, expense);

      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('Tom &amp; Jerry supplies');
    });

    it('should escape angle brackets', async () => {
      const expense = {
        id: 'id',
        expenseNumber: 'EXP-001',
        totalAmount: '100',
        currency: 'PKR',
        description: 'Value < 100 > 50',
        submitter: { firstName: 'A', lastName: 'B' },
        category: { name: 'General' },
      };

      await service.sendExpenseSubmittedEmail({ email: 'a@b.com' }, expense);

      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('Value &lt; 100 &gt; 50');
    });

    it('should escape double quotes', async () => {
      const expense = {
        id: 'id',
        expenseNumber: 'EXP-001',
        totalAmount: '100',
        currency: 'PKR',
        description: 'Called "urgent" expense',
        submitter: { firstName: 'A', lastName: 'B' },
        category: { name: 'General' },
      };

      await service.sendExpenseSubmittedEmail({ email: 'a@b.com' }, expense);

      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('Called &quot;urgent&quot; expense');
    });

    it('should escape all special characters in combination', async () => {
      const reason = 'Receipt says "Total < $100" & is invalid';

      await service.sendExpenseRejectedEmail(
        { email: 'a@b.com' },
        { id: 'id', expenseNumber: 'EXP-001', totalAmount: '100', currency: 'PKR' },
        reason,
      );

      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).toContain(
        'Receipt says &quot;Total &lt; $100&quot; &amp; is invalid',
      );
    });
  });

  describe('getAppUrl (tested via email methods)', () => {
    it('should use FRONTEND_URL from config', async () => {
      await service.sendPasswordResetEmail(
        { email: 'user@test.com', firstName: 'Test' },
        'token-123',
      );

      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('https://expense.tekcellent.com/reset-password');
    });

    it('should default to http://localhost:5173 when FRONTEND_URL not set', async () => {
      jest.clearAllMocks();

      const configWithoutFrontendUrl = {
        get: jest.fn((key: string, defaultValue?: unknown) => {
          const config: Record<string, unknown> = {
            SMTP_HOST: 'localhost',
            SMTP_PORT: 1025,
            SMTP_SECURE: false,
            SMTP_USER: undefined,
            SMTP_FROM: 'noreply@tekcellent.com',
          };
          return config[key] ?? defaultValue;
        }),
      };

      (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);

      const fallbackModule: TestingModule = await Test.createTestingModule({
        providers: [
          EmailService,
          { provide: ConfigService, useValue: configWithoutFrontendUrl },
        ],
      }).compile();

      const fallbackService = fallbackModule.get<EmailService>(EmailService);

      await fallbackService.sendPasswordResetEmail(
        { email: 'user@test.com', firstName: 'Test' },
        'token-456',
      );

      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('http://localhost:5173/reset-password?token=token-456');
    });
  });
});
