import { Notification } from '../models/index.js';

class NotificationServiceClass {
  constructor() {
    this.wsCallback = null;
  }

  // Register callback to emit real-time notifications over WebSockets without circular dependencies
  registerWsCallback(callback) {
    this.wsCallback = callback;
  }

  async createNotification(userEmail, message, type) {
    try {
      console.log(`[NotificationService] Creating notification for "${userEmail}": ${message}`);
      const notification = await Notification.create({
        userEmail,
        message,
        type,
        isRead: false
      });

      if (this.wsCallback) {
        this.wsCallback(userEmail, {
          id: notification.id,
          message: notification.message,
          type: notification.type,
          isRead: notification.isRead,
          createdAt: notification.createdAt
        });
      }

      return notification;
    } catch (error) {
      console.error('[NotificationService] Error creating notification:', error.message);
    }
  }

  async getUserNotifications(userEmail) {
    return Notification.findAll({
      where: {
        userEmail: [userEmail, 'all']
      },
      order: [['createdAt', 'DESC']],
      limit: 20
    });
  }

  async markAsRead(id) {
    return Notification.update({ isRead: true }, { where: { id } });
  }
}

export const NotificationService = new NotificationServiceClass();
export default NotificationService;
