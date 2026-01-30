# Skill: Notification Patterns

## Context
This skill contains notification implementation patterns for the expense automation system. Reference this when implementing any notification-related functionality including in-app, email, and digest notifications.

---

## Notification Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Notification Service                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │   Event     │───►│ Notification│───►│   Channel   │         │
│  │   Trigger   │    │   Factory   │    │   Router    │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
│                                               │                  │
│                          ┌────────────────────┼────────────┐     │
│                          ▼                    ▼            ▼     │
│                   ┌──────────┐         ┌──────────┐ ┌──────────┐│
│                   │  In-App  │         │  Email   │ │  Digest  ││
│                   │  Queue   │         │  Queue   │ │  Queue   ││
│                   └──────────┘         └──────────┘ └──────────┘│
│                          │                    │            │     │
│                          ▼                    ▼            ▼     │
│                   ┌──────────┐         ┌──────────┐ ┌──────────┐│
│                   │  WebSocket│        │   SES/   │ │  Daily   ││
│                   │  Push    │         │  SMTP    │ │  Cron    ││
│                   └──────────┘         └──────────┘ └──────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Models

### Notification Entity

```typescript
interface Notification {
  id: string;

  // Recipient
  userId: string;

  // Content
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;    // Additional context (IDs, amounts, etc.)

  // Delivery
  channels: NotificationChannel[];

  // Status
  status: NotificationStatus;
  readAt?: Date;

  // Email specific
  emailSentAt?: Date;
  emailStatus?: 'PENDING' | 'SENT' | 'FAILED';
  emailError?: string;

  // Audit
  createdAt: Date;
  updatedAt: Date;
}

enum NotificationChannel {
  IN_APP = 'IN_APP',
  EMAIL = 'EMAIL',
}

enum NotificationStatus {
  UNREAD = 'UNREAD',
  READ = 'READ',
  ARCHIVED = 'ARCHIVED',
}

enum NotificationType {
  // Expense related
  EXPENSE_SUBMITTED = 'EXPENSE_SUBMITTED',
  EXPENSE_APPROVED = 'EXPENSE_APPROVED',
  EXPENSE_REJECTED = 'EXPENSE_REJECTED',
  EXPENSE_CLARIFICATION_REQUESTED = 'EXPENSE_CLARIFICATION_REQUESTED',
  EXPENSE_SETTLED = 'EXPENSE_SETTLED',

  // Approval related
  APPROVAL_REQUIRED = 'APPROVAL_REQUIRED',
  APPROVAL_REMINDER = 'APPROVAL_REMINDER',
  APPROVAL_ESCALATED = 'APPROVAL_ESCALATED',
  BULK_APPROVAL_COMPLETE = 'BULK_APPROVAL_COMPLETE',

  // Pre-approval related
  PRE_APPROVAL_REQUESTED = 'PRE_APPROVAL_REQUESTED',
  PRE_APPROVAL_APPROVED = 'PRE_APPROVAL_APPROVED',
  PRE_APPROVAL_REJECTED = 'PRE_APPROVAL_REJECTED',
  PRE_APPROVAL_EXPIRING = 'PRE_APPROVAL_EXPIRING',
  PRE_APPROVAL_EXPIRED = 'PRE_APPROVAL_EXPIRED',

  // Voucher related
  VOUCHER_REQUESTED = 'VOUCHER_REQUESTED',
  VOUCHER_APPROVED = 'VOUCHER_APPROVED',
  VOUCHER_DISBURSED = 'VOUCHER_DISBURSED',
  VOUCHER_SETTLEMENT_REMINDER = 'VOUCHER_SETTLEMENT_REMINDER',
  VOUCHER_OVERDUE = 'VOUCHER_OVERDUE',
  VOUCHER_SETTLED = 'VOUCHER_SETTLED',

  // Budget related
  BUDGET_THRESHOLD_WARNING = 'BUDGET_THRESHOLD_WARNING',
  BUDGET_EXCEEDED = 'BUDGET_EXCEEDED',

  // Delegation
  DELEGATION_STARTED = 'DELEGATION_STARTED',
  DELEGATION_ENDED = 'DELEGATION_ENDED',
  DELEGATION_REVOKED = 'DELEGATION_REVOKED',

  // System
  COMMENT_MENTION = 'COMMENT_MENTION',
  COMMENT_ADDED = 'COMMENT_ADDED',
  SYSTEM_ANNOUNCEMENT = 'SYSTEM_ANNOUNCEMENT',
}
```

### User Notification Preferences

```typescript
interface NotificationPreferences {
  id: string;
  userId: string;

  // Channel preferences
  enableInApp: boolean;          // Default: true
  enableEmail: boolean;          // Default: true

  // Delivery preferences
  emailFrequency: 'REALTIME' | 'DAILY_DIGEST' | 'WEEKLY_DIGEST';
  digestTime?: string;           // e.g., "09:00" for daily digest

  // Type-specific preferences
  typePreferences: {
    [type in NotificationType]?: {
      inApp: boolean;
      email: boolean;
    };
  };

  // Quiet hours
  quietHoursEnabled: boolean;
  quietHoursStart?: string;      // e.g., "22:00"
  quietHoursEnd?: string;        // e.g., "08:00"

  createdAt: Date;
  updatedAt: Date;
}
```

---

## Notification Templates

### Template Configuration

```typescript
const NOTIFICATION_TEMPLATES: Record<NotificationType, NotificationTemplate> = {
  // Expense Submitted
  EXPENSE_SUBMITTED: {
    title: 'Expense Submitted',
    message: 'Your expense for {{amount}} has been submitted for approval.',
    emailSubject: 'Expense Submitted - {{expenseId}}',
    emailTemplate: 'expense-submitted',
    defaultChannels: ['IN_APP', 'EMAIL'],
    priority: 'NORMAL',
  },

  // Expense Approved
  EXPENSE_APPROVED: {
    title: 'Expense Approved',
    message: 'Your expense for {{amount}} has been approved.',
    emailSubject: 'Expense Approved - {{expenseId}}',
    emailTemplate: 'expense-approved',
    defaultChannels: ['IN_APP', 'EMAIL'],
    priority: 'NORMAL',
  },

  // Expense Rejected
  EXPENSE_REJECTED: {
    title: 'Expense Rejected',
    message: 'Your expense for {{amount}} has been rejected. Reason: {{reason}}',
    emailSubject: 'Expense Rejected - {{expenseId}}',
    emailTemplate: 'expense-rejected',
    defaultChannels: ['IN_APP', 'EMAIL'],
    priority: 'HIGH',
  },

  // Approval Required
  APPROVAL_REQUIRED: {
    title: 'Approval Required',
    message: '{{employeeName}} has submitted an expense for {{amount}} requiring your approval.',
    emailSubject: 'Approval Required - Expense from {{employeeName}}',
    emailTemplate: 'approval-required',
    defaultChannels: ['IN_APP', 'EMAIL'],
    priority: 'HIGH',
  },

  // Budget Warning
  BUDGET_THRESHOLD_WARNING: {
    title: 'Budget Alert',
    message: 'Budget "{{budgetName}}" has reached {{percentage}}% utilization.',
    emailSubject: 'Budget Alert - {{budgetName}} at {{percentage}}%',
    emailTemplate: 'budget-warning',
    defaultChannels: ['IN_APP', 'EMAIL'],
    priority: 'HIGH',
  },

  // Voucher Overdue
  VOUCHER_OVERDUE: {
    title: 'Voucher Overdue',
    message: 'Voucher {{voucherNumber}} is overdue for settlement.',
    emailSubject: 'URGENT: Petty Cash Voucher Overdue - {{voucherNumber}}',
    emailTemplate: 'voucher-overdue',
    defaultChannels: ['IN_APP', 'EMAIL'],
    priority: 'URGENT',
  },
};

interface NotificationTemplate {
  title: string;
  message: string;
  emailSubject: string;
  emailTemplate: string;
  defaultChannels: NotificationChannel[];
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
}
```

---

## Notification Service

### Core Service

```typescript
@Injectable()
export class NotificationService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private websocketGateway: NotificationGateway,
    private digestService: DigestService,
  ) {}

  async send(input: SendNotificationInput): Promise<Notification> {
    const { userId, type, title, message, data } = input;

    // Get template
    const template = NOTIFICATION_TEMPLATES[type];

    // Get user preferences
    const preferences = await this.getUserPreferences(userId);

    // Determine channels
    const channels = this.determineChannels(type, preferences, template);

    // Interpolate message
    const interpolatedTitle = this.interpolate(title || template.title, data);
    const interpolatedMessage = this.interpolate(message || template.message, data);

    // Create notification record
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        type,
        title: interpolatedTitle,
        message: interpolatedMessage,
        data,
        channels,
        status: NotificationStatus.UNREAD,
      },
    });

    // Send to each channel
    await this.deliverToChannels(notification, preferences, template);

    return notification;
  }

  private determineChannels(
    type: NotificationType,
    preferences: NotificationPreferences,
    template: NotificationTemplate
  ): NotificationChannel[] {
    const channels: NotificationChannel[] = [];

    // Check type-specific preferences
    const typePrefs = preferences.typePreferences?.[type];

    // In-app
    if (preferences.enableInApp && (typePrefs?.inApp !== false)) {
      channels.push(NotificationChannel.IN_APP);
    }

    // Email
    if (preferences.enableEmail && (typePrefs?.email !== false)) {
      channels.push(NotificationChannel.EMAIL);
    }

    return channels;
  }

  private async deliverToChannels(
    notification: Notification,
    preferences: NotificationPreferences,
    template: NotificationTemplate
  ): Promise<void> {
    const deliveryPromises: Promise<void>[] = [];

    // In-app (WebSocket)
    if (notification.channels.includes(NotificationChannel.IN_APP)) {
      deliveryPromises.push(
        this.websocketGateway.sendToUser(notification.userId, notification)
      );
    }

    // Email
    if (notification.channels.includes(NotificationChannel.EMAIL)) {
      if (preferences.emailFrequency === 'REALTIME') {
        deliveryPromises.push(
          this.sendEmail(notification, template)
        );
      } else {
        // Queue for digest
        deliveryPromises.push(
          this.digestService.queueForDigest(notification, preferences)
        );
      }
    }

    await Promise.allSettled(deliveryPromises);
  }

  private async sendEmail(
    notification: Notification,
    template: NotificationTemplate
  ): Promise<void> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: notification.userId },
      });

      await this.emailService.send({
        to: user.email,
        subject: this.interpolate(template.emailSubject, notification.data),
        template: template.emailTemplate,
        data: {
          ...notification.data,
          userName: user.firstName,
          title: notification.title,
          message: notification.message,
        },
      });

      await this.prisma.notification.update({
        where: { id: notification.id },
        data: {
          emailSentAt: new Date(),
          emailStatus: 'SENT',
        },
      });
    } catch (error) {
      await this.prisma.notification.update({
        where: { id: notification.id },
        data: {
          emailStatus: 'FAILED',
          emailError: error.message,
        },
      });

      this.logger.error(`Failed to send email for notification ${notification.id}`, error);
    }
  }

  private interpolate(template: string, data: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data?.[key]?.toString() || match;
    });
  }

  async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    let preferences = await this.prisma.notificationPreferences.findUnique({
      where: { userId },
    });

    if (!preferences) {
      // Create default preferences
      preferences = await this.prisma.notificationPreferences.create({
        data: {
          userId,
          enableInApp: true,
          enableEmail: true,
          emailFrequency: 'REALTIME',
          typePreferences: {},
          quietHoursEnabled: false,
        },
      });
    }

    return preferences;
  }
}
```

---

## WebSocket Gateway

```typescript
@WebSocketGateway({
  namespace: '/notifications',
  cors: { origin: '*' },
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSockets: Map<string, Set<string>> = new Map();

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token;
      const user = await this.authService.verifyToken(token);

      // Store socket connection
      if (!this.userSockets.has(user.id)) {
        this.userSockets.set(user.id, new Set());
      }
      this.userSockets.get(user.id).add(client.id);

      // Join user's room
      client.join(`user:${user.id}`);

      // Send unread count
      const unreadCount = await this.getUnreadCount(user.id);
      client.emit('unread_count', { count: unreadCount });

    } catch (error) {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    // Remove socket from all user mappings
    for (const [userId, sockets] of this.userSockets) {
      if (sockets.has(client.id)) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.userSockets.delete(userId);
        }
        break;
      }
    }
  }

  async sendToUser(userId: string, notification: Notification): Promise<void> {
    this.server.to(`user:${userId}`).emit('notification', {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      createdAt: notification.createdAt,
    });

    // Also emit updated unread count
    const unreadCount = await this.getUnreadCount(userId);
    this.server.to(`user:${userId}`).emit('unread_count', { count: unreadCount });
  }

  @SubscribeMessage('mark_read')
  async handleMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { notificationId: string }
  ) {
    const user = await this.getUserFromSocket(client);
    await this.notificationService.markAsRead(data.notificationId, user.id);

    const unreadCount = await this.getUnreadCount(user.id);
    client.emit('unread_count', { count: unreadCount });
  }

  @SubscribeMessage('mark_all_read')
  async handleMarkAllRead(@ConnectedSocket() client: Socket) {
    const user = await this.getUserFromSocket(client);
    await this.notificationService.markAllAsRead(user.id);

    client.emit('unread_count', { count: 0 });
  }
}
```

---

## Notification API Endpoints

```typescript
@Controller('api/v1/notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private notificationService: NotificationService) {}

  // Get user's notifications
  @Get()
  async findAll(
    @CurrentUser() user: User,
    @Query() query: NotificationQueryDto
  ): Promise<PaginatedResult<Notification>> {
    return this.notificationService.findByUser(user.id, query);
  }

  // Get unread count
  @Get('unread-count')
  async getUnreadCount(@CurrentUser() user: User): Promise<{ count: number }> {
    const count = await this.notificationService.getUnreadCount(user.id);
    return { count };
  }

  // Mark as read
  @Patch(':id/read')
  async markAsRead(
    @CurrentUser() user: User,
    @Param('id') id: string
  ): Promise<Notification> {
    return this.notificationService.markAsRead(id, user.id);
  }

  // Mark all as read
  @Patch('read-all')
  async markAllAsRead(@CurrentUser() user: User): Promise<void> {
    await this.notificationService.markAllAsRead(user.id);
  }

  // Get/Update preferences
  @Get('preferences')
  async getPreferences(@CurrentUser() user: User): Promise<NotificationPreferences> {
    return this.notificationService.getUserPreferences(user.id);
  }

  @Patch('preferences')
  async updatePreferences(
    @CurrentUser() user: User,
    @Body() dto: UpdatePreferencesDto
  ): Promise<NotificationPreferences> {
    return this.notificationService.updatePreferences(user.id, dto);
  }
}
```

---

## Best Practices

1. **Always check preferences** before sending notifications
2. **Use templates** for consistent messaging
3. **Include action URLs** in notifications
4. **Respect quiet hours** for non-urgent notifications
5. **Batch similar notifications** when appropriate
6. **Log delivery failures** for troubleshooting
7. **Implement retry logic** for failed emails
8. **Keep notifications concise** - link to details

---

## Error Handling

```typescript
const NOTIFICATION_ERRORS = {
  USER_NOT_FOUND: 'User not found',
  NOTIFICATION_NOT_FOUND: 'Notification not found',
  NOT_OWNER: 'You can only access your own notifications',
  EMAIL_SEND_FAILED: 'Failed to send email notification',
  INVALID_PREFERENCE: 'Invalid notification preference',
  TEMPLATE_NOT_FOUND: 'Email template not found',
};
```
