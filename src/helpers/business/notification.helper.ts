import { expect, Page } from '@playwright/test';
import { logger } from '../../core/logger';

/**
 * Notification types supported by the system
 */
export enum NotificationType {
  TASK = 'TASK',
  APPROVAL = 'APPROVAL',
  ALERT = 'ALERT',
  ANNOUNCEMENT = 'ANNOUNCEMENT',
  REMINDER = 'REMINDER',
  SYSTEM = 'SYSTEM',
}

/**
 * Notification priority levels
 */
export enum NotificationPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

/**
 * Notification helper for business notifications
 */
export class NotificationHelper {
  constructor(private page: Page) {}

  /**
   * Send notification to users
   */
  async sendNotification(options: {
    type: NotificationType;
    recipients: string[];
    subject: string;
    message: string;
    priority?: NotificationPriority;
    actionUrl?: string;
    expiryDate?: string;
    attachments?: string[];
  }): Promise<string> {
    try {
      // Navigate to notifications
      await this.page.click('[data-testid="notifications-menu"]');
      await this.page.click('[data-testid="create-notification"]');

      // Set notification details
      await this.page.selectOption('[data-testid="notification-type"]', options.type);
      await this.page.fill('[data-testid="notification-subject"]', options.subject);
      await this.page.fill('[data-testid="notification-message"]', options.message);

      // Add recipients
      for (const recipient of options.recipients) {
        await this.page.click('[data-testid="add-recipient"]');
        await this.page.fill('[data-testid="recipient-input"]', recipient);
        await this.page.keyboard.press('Enter');
      }

      // Set optional fields
      if (options.priority) {
        await this.page.selectOption('[data-testid="notification-priority"]', options.priority);
      }
      if (options.actionUrl) {
        await this.page.fill('[data-testid="action-url"]', options.actionUrl);
      }
      if (options.expiryDate) {
        await this.page.fill('[data-testid="expiry-date"]', options.expiryDate);
      }
      if (options.attachments) {
        for (const attachment of options.attachments) {
          const fileInput = this.page.locator('input[type="file"]');
          await fileInput.setInputFiles(attachment);
        }
      }

      // Send notification
      await this.page.click('[data-testid="send-notification"]');

      // Get notification ID
      const notificationId = await this.getSentNotificationId();

      logger.info(`Sent ${options.type} notification`, { notificationId });
      return notificationId;
    } catch (error) {
      logger.logError(`Failed to send ${options.type} notification`, error);
      throw error;
    }
  }

  /**
   * Get user notifications
   */
  async getNotifications(filters?: {
    type?: NotificationType;
    priority?: NotificationPriority;
    unreadOnly?: boolean;
    dateRange?: { start: string; end: string };
  }): Promise<any[]> {
    try {
      // Navigate to notifications
      await this.page.click('[data-testid="notifications-menu"]');

      // Apply filters
      if (filters) {
        await this.applyNotificationFilters(filters);
      }

      // Extract notifications
      const notifications = await this.extractNotifications();

      logger.info('Retrieved notifications', { count: notifications.length });
      return notifications;
    } catch (error) {
      logger.logError('Failed to get notifications', error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    try {
      await this.page.click(`[data-notification-id="${notificationId}"] [data-testid="mark-read"]`);
      await this.verifyNotificationRead(notificationId);

      logger.info(`Marked notification ${notificationId} as read`);
    } catch (error) {
      logger.logError(`Failed to mark notification ${notificationId} as read`, error);
      throw error;
    }
  }

  /**
   * Take action on notification
   */
  async takeAction(notificationId: string, action: string): Promise<void> {
    try {
      // Open notification
      await this.page.click(`[data-notification-id="${notificationId}"]`);

      // Take action
      await this.page.click(`[data-testid="action-${action}"]`);

      // Verify action taken
      await this.verifyActionTaken(notificationId, action);

      logger.info(`Took action ${action} on notification ${notificationId}`);
    } catch (error) {
      logger.logError(`Failed to take action on notification ${notificationId}`, error);
      throw error;
    }
  }

  /**
   * Subscribe to notification type
   */
  async subscribeToNotifications(
    type: NotificationType,
    preferences?: {
      email?: boolean;
      push?: boolean;
      inApp?: boolean;
    },
  ): Promise<void> {
    try {
      // Navigate to notification settings
      await this.page.click('[data-testid="notifications-menu"]');
      await this.page.click('[data-testid="notification-settings"]');

      // Select notification type
      await this.page.click(`[data-notification-type="${type}"]`);

      // Set preferences
      if (preferences?.email !== undefined) {
        await this.page.setChecked('[data-testid="email-notifications"]', preferences.email);
      }
      if (preferences?.push !== undefined) {
        await this.page.setChecked('[data-testid="push-notifications"]', preferences.push);
      }
      if (preferences?.inApp !== undefined) {
        await this.page.setChecked('[data-testid="in-app-notifications"]', preferences.inApp);
      }

      // Save preferences
      await this.page.click('[data-testid="save-preferences"]');

      logger.info(`Subscribed to ${type} notifications`);
    } catch (error) {
      logger.logError(`Failed to subscribe to ${type} notifications`, error);
      throw error;
    }
  }

  /**
   * Get sent notification ID
   */
  private async getSentNotificationId(): Promise<string> {
    await this.page.waitForURL(/\/notifications\/(\d+)$/);
    const url = this.page.url();
    return url.split('/').pop() || '';
  }

  /**
   * Apply notification filters
   */
  private async applyNotificationFilters(filters: {
    type?: NotificationType;
    priority?: NotificationPriority;
    unreadOnly?: boolean;
    dateRange?: { start: string; end: string };
  }): Promise<void> {
    if (filters.type) {
      await this.page.selectOption('[data-testid="filter-type"]', filters.type);
    }
    if (filters.priority) {
      await this.page.selectOption('[data-testid="filter-priority"]', filters.priority);
    }
    if (filters.unreadOnly) {
      await this.page.setChecked('[data-testid="unread-only"]', true);
    }
    if (filters.dateRange) {
      await this.page.fill('[data-testid="filter-date-start"]', filters.dateRange.start);
      await this.page.fill('[data-testid="filter-date-end"]', filters.dateRange.end);
    }

    await this.page.click('[data-testid="apply-filters"]');
  }

  /**
   * Extract notifications
   */
  private async extractNotifications(): Promise<any[]> {
    const notifications: any[] = [];
    const items = await this.page.locator('[data-testid="notification-item"]').all();

    for (const item of items) {
      notifications.push({
        id: await item.getAttribute('data-notification-id'),
        type: await item.getAttribute('data-notification-type'),
        subject: await item.locator('[data-testid="notification-subject"]').textContent(),
        message: await item.locator('[data-testid="notification-message"]').textContent(),
        priority: await item.getAttribute('data-priority'),
        isRead: (await item.getAttribute('data-is-read')) === 'true',
        receivedAt: await item.getAttribute('data-received-at'),
        sender: await item.getAttribute('data-sender'),
      });
    }

    return notifications;
  }

  /**
   * Verify notification read status
   */
  private async verifyNotificationRead(notificationId: string): Promise<void> {
    const notification = this.page.locator(`[data-notification-id="${notificationId}"]`);
    await expect(notification).toHaveAttribute('data-is-read', 'true');
  }

  /**
   * Verify action taken on notification
   */
  private async verifyActionTaken(notificationId: string, action: string): Promise<void> {
    const notification = this.page.locator(`[data-notification-id="${notificationId}"]`);
    await expect(notification).toHaveAttribute('data-action-taken', action);
  }
}
