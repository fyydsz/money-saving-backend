import { Types } from "mongoose";
import { Notification, NotificationType } from "../../db";

export interface CreateNotificationParams {
  recipient: string | Types.ObjectId;
  sender: string | Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
}

export class NotificationService {
  async createNotification(params: CreateNotificationParams) {
    const notification = new Notification({
      recipient: new Types.ObjectId(params.recipient.toString()),
      sender: new Types.ObjectId(params.sender.toString()),
      type: params.type,
      title: params.title,
      message: params.message,
      data: params.data || {},
      isRead: false,
    });

    await notification.save();
    return notification;
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

    const query: any = {
      recipient: new Types.ObjectId(userId),
    };

    if (options.unreadOnly) {
      query.isRead = false;
    }

    if (options.type) {
      query.type = options.type;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("sender", "name username email image")
        .lean(),
      Notification.countDocuments(query),
      Notification.countDocuments({
        recipient: new Types.ObjectId(userId),
        isRead: false,
      }),
    ]);

    return {
      notifications,
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
    return Notification.countDocuments({
      recipient: new Types.ObjectId(userId),
      isRead: false,
    });
  }

  async markAsRead(userId: string, notificationId: string) {
    const notification = await Notification.findOneAndUpdate(
      {
        _id: new Types.ObjectId(notificationId),
        recipient: new Types.ObjectId(userId),
      },
      {
        isRead: true,
        readAt: new Date(),
      },
      { new: true }
    );

    if (!notification) {
      throw new Error("Notification not found");
    }

    return notification;
  }

  async markAllAsRead(userId: string) {
    const result = await Notification.updateMany(
      {
        recipient: new Types.ObjectId(userId),
        isRead: false,
      },
      {
        isRead: true,
        readAt: new Date(),
      }
    );

    return {
      message: "All notifications marked as read",
      modifiedCount: result.modifiedCount,
    };
  }

  async deleteNotification(userId: string, notificationId: string) {
    const result = await Notification.findOneAndDelete({
      _id: new Types.ObjectId(notificationId),
      recipient: new Types.ObjectId(userId),
    });

    if (!result) {
      throw new Error("Notification not found");
    }

    return {
      message: "Notification deleted successfully",
      success: true,
    };
  }
}
