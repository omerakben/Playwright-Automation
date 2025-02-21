import { faker } from '@faker-js/faker';
import { AuthHelper } from '../../src/helpers/business/auth.helper';
import {
  NotificationHelper,
  NotificationPriority,
  NotificationType,
} from '../../src/helpers/business/notification.helper';
import { UserRole } from '../../src/helpers/types/business.types';
import { test } from '../fixtures/e2e.fixture';

/**
 * @group notification-management
 * @description Tests for notification system including sending, receiving, and managing notifications
 */
test.describe('Notification Management', () => {
  let authHelper: AuthHelper;
  let notificationHelper: NotificationHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    notificationHelper = new NotificationHelper(page);

    // Login as admin for notification management
    await authHelper.loginAs(UserRole.ADMIN);
  });

  /**
   * @test Send and verify notifications
   * @description Tests sending notifications with different priorities and types
   */
  test('should send and verify notifications', async () => {
    // Send notifications with different priorities
    const notifications = await Promise.all([
      notificationHelper.sendNotification({
        type: NotificationType.ANNOUNCEMENT,
        recipients: [faker.internet.email(), faker.internet.email()],
        subject: 'System Maintenance',
        message: 'Scheduled maintenance this weekend',
        priority: NotificationPriority.HIGH,
      }),
      notificationHelper.sendNotification({
        type: NotificationType.TASK,
        recipients: [faker.internet.email()],
        subject: 'Review Required',
        message: 'Please review the attached document',
        priority: NotificationPriority.MEDIUM,
        actionUrl: '/documents/123',
      }),
    ]);

    // Verify notifications were sent
    const allNotifications = await notificationHelper.getNotifications();
    await test.expect(allNotifications.length).toBeGreaterThanOrEqual(2);
    for (const notificationId of notifications) {
      await test.expect(allNotifications.some((n) => n.id === notificationId)).toBeTruthy();
    }

    // Verify high priority notifications
    const highPriorityNotifications = await notificationHelper.getNotifications({
      priority: NotificationPriority.HIGH,
    });
    await test.expect(highPriorityNotifications).toHaveLength(1);
    await test.expect(highPriorityNotifications[0].subject).toBe('System Maintenance');
  });

  /**
   * @test Notification filtering and management
   * @description Tests notification filtering, marking as read, and taking actions
   */
  test('should filter and manage notifications', async () => {
    // Send test notifications
    const taskNotificationId = await notificationHelper.sendNotification({
      type: NotificationType.TASK,
      recipients: [faker.internet.email()],
      subject: 'Complete Task',
      message: 'Task requires attention',
      priority: NotificationPriority.MEDIUM,
    });

    // Filter by type
    const taskNotifications = await notificationHelper.getNotifications({
      type: NotificationType.TASK,
    });
    await test.expect(taskNotifications).toHaveLength(1);
    await test.expect(taskNotifications[0].id).toBe(taskNotificationId);

    // Mark notification as read
    await notificationHelper.markAsRead(taskNotificationId);

    // Verify unread filter
    const unreadNotifications = await notificationHelper.getNotifications({
      unreadOnly: true,
    });
    await test.expect(unreadNotifications.every((n) => n.id !== taskNotificationId)).toBeTruthy();

    // Take action on notification
    await notificationHelper.takeAction(taskNotificationId, 'complete');
  });

  /**
   * @test Notification subscription management
   * @description Tests notification subscription preferences and settings
   */
  test('should manage notification subscriptions', async () => {
    // Subscribe to different notification types
    await notificationHelper.subscribeToNotifications(NotificationType.ANNOUNCEMENT, {
      email: true,
      push: true,
      inApp: true,
    });

    await notificationHelper.subscribeToNotifications(NotificationType.TASK, {
      email: true,
      push: false,
      inApp: true,
    });

    // Send notification of subscribed type
    const notificationId = await notificationHelper.sendNotification({
      type: NotificationType.ANNOUNCEMENT,
      recipients: [faker.internet.email()],
      subject: 'Important Announcement',
      message: 'This is a test announcement',
      priority: NotificationPriority.MEDIUM,
    });

    // Verify notification delivery
    const notifications = await notificationHelper.getNotifications({
      type: NotificationType.ANNOUNCEMENT,
    });
    await test.expect(notifications).toHaveLength(1);
    await test.expect(notifications[0].id).toBe(notificationId);
  });

  /**
   * @test Time-sensitive notifications
   * @description Tests notifications with expiry dates and time-sensitive actions
   */
  test('should handle time-sensitive notifications', async () => {
    // Send notification with expiry
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + 24); // 24 hours from now

    const notificationId = await notificationHelper.sendNotification({
      type: NotificationType.ALERT,
      recipients: [faker.internet.email()],
      subject: 'Time-Sensitive Alert',
      message: 'Action required within 24 hours',
      priority: NotificationPriority.URGENT,
      expiryDate: expiryDate.toISOString().split('T')[0],
    });

    // Verify urgent notifications
    const urgentNotifications = await notificationHelper.getNotifications({
      priority: NotificationPriority.URGENT,
    });
    await test.expect(urgentNotifications).toHaveLength(1);
    await test.expect(urgentNotifications[0].id).toBe(notificationId);

    // Take immediate action
    await notificationHelper.takeAction(notificationId, 'acknowledge');

    // Verify notification status after action
    const updatedNotifications = await notificationHelper.getNotifications({
      type: NotificationType.ALERT,
    });
    const actionedNotification = updatedNotifications.find((n) => n.id === notificationId);
    await test.expect(actionedNotification?.isRead).toBeTruthy();
  });

  /**
   * @test Bulk notification operations
   * @description Tests sending and managing notifications in bulk
   */
  test('should handle bulk notification operations', async () => {
    // Send multiple notifications
    const notificationIds = await Promise.all(
      Array(5)
        .fill(null)
        .map((_, index) =>
          notificationHelper.sendNotification({
            type: NotificationType.SYSTEM,
            recipients: [faker.internet.email()],
            subject: `Bulk Test ${index + 1}`,
            message: `Bulk test message ${index + 1}`,
            priority: NotificationPriority.LOW,
          }),
        ),
    );

    // Mark all as read
    for (const id of notificationIds) {
      await notificationHelper.markAsRead(id);
    }

    // Verify all marked as read
    const unreadNotifications = await notificationHelper.getNotifications({
      unreadOnly: true,
    });
    await test
      .expect(unreadNotifications.every((n) => !notificationIds.includes(n.id)))
      .toBeTruthy();

    // Filter by date range
    const recentNotifications = await notificationHelper.getNotifications({
      dateRange: {
        start: new Date(Date.now() - 3600000).toISOString().split('T')[0], // Last hour
        end: new Date().toISOString().split('T')[0],
      },
    });
    await test.expect(recentNotifications.length).toBeGreaterThanOrEqual(5);
  });
});
