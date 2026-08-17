import { prisma } from "../../db";

export type NotificationType =
  | "FRIEND_REQUEST"
  | "FRIEND_ACCEPTED"
  | "GOAL_INVITATION"
  | "GOAL_ACCEPTED"
  | "GOAL_CONTRIBUTION"
  | "GOAL_MILESTONE"
  | "SYSTEM";

export interface CreateNotificationParams {
  recipientId: string;
  senderId?: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
}

export class NotificationService {
  async createNotification(params: CreateNotificationParams) {
    return await prisma.notification.create({
      data: {
        recipientId: params.recipientId,
        senderId: params.senderId,
        type: params.type,
        title: params.title,
        message: params.message,
        data: params.data ? JSON.stringify(params.data) : null,
        isRead: false,
      },
    });
  }

  async getUserNotifications(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      unreadOnly?: boolean;
      type?: string;
    } = {}
  ) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(50, Math.max(1, options.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      recipientId: userId,
    };

    if (options.unreadOnly) {
      where.isRead = false;
    }

    if (options.type) {
      where.type = options.type;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          sender: {
            select: { id: true, name: true, username: true, email: true, image: true },
          },
        },
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: { recipientId: userId, isRead: false },
      }),
    ]);

    return {
      notifications: notifications.map((n) => {
        let parsedData = null;
        if (n.data) {
          try {
            parsedData = typeof n.data === "string" ? JSON.parse(n.data) : n.data;
          } catch {
            parsedData = n.data;
          }
        }
        return {
          ...n,
          data: parsedData,
        };
      }),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      unreadCount,
    };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({
      where: { recipientId: userId, isRead: false },
    });
  }

  async markAsRead(userId: string, notificationId: string) {
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, recipientId: userId },
    });

    if (!notification) {
      throw new Error("Notification not found");
    }

    return await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    const result = await prisma.notification.updateMany({
      where: { recipientId: userId, isRead: false },
      data: { isRead: true },
    });

    return {
      message: "All notifications marked as read",
      modifiedCount: result.count,
    };
  }

  async deleteNotification(userId: string, notificationId: string) {
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, recipientId: userId },
    });

    if (!notification) {
      throw new Error("Notification not found");
    }

    await prisma.notification.delete({
      where: { id: notificationId },
    });

    return {
      message: "Notification deleted successfully",
      success: true,
    };
  }
}
