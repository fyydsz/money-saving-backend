import { expect, describe, it } from "bun:test";
import { Types } from "mongoose";
import { NotificationService } from "./notification.service";
import { Notification } from "../../db";

describe("NotificationService Unit Tests", () => {
  const notificationService = new NotificationService();
  const mockUserId = new Types.ObjectId().toString();
  const mockSenderId = new Types.ObjectId().toString();
  const mockNotificationId = new Types.ObjectId().toString();

  it("should create notification with unread status", async () => {
    const originalSave = Notification.prototype.save;
    try {
      Notification.prototype.save = async function () {
        return this;
      };

      const notif = await notificationService.createNotification({
        recipient: mockUserId,
        sender: mockSenderId,
        type: "FRIEND_REQUEST",
        title: "Friend Request",
        message: "Budi sent you a friend request",
        data: { custom: "test" },
      });

      expect(notif.type).toBe("FRIEND_REQUEST");
      expect(notif.title).toBe("Friend Request");
      expect(notif.isRead).toBe(false);
      expect(notif.recipient.toString()).toBe(mockUserId);
    } finally {
      Notification.prototype.save = originalSave;
    }
  });

  it("should get user notifications with unread count and pagination", async () => {
    const originalFind = Notification.find;
    const originalCount = Notification.countDocuments;

    try {
      Notification.find = (() => ({
        sort: () => ({
          skip: () => ({
            limit: () => ({
              populate: () => ({
                lean: async () => [
                  {
                    _id: new Types.ObjectId(mockNotificationId),
                    title: "Test Notif",
                    isRead: false,
                    sender: { name: "Budi" },
                  },
                ],
              }),
            }),
          }),
        }),
      })) as any;

      let countCalls = 0;
      Notification.countDocuments = (async () => {
        countCalls++;
        return countCalls === 1 ? 1 : 1;
      }) as any;

      const result = await notificationService.getUserNotifications(mockUserId, {
        page: 1,
        limit: 10,
      });

      expect(result.notifications.length).toBe(1);
      expect(result.unreadCount).toBe(1);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.totalPages).toBe(1);
    } finally {
      Notification.find = originalFind;
      Notification.countDocuments = originalCount;
    }
  });

  it("should mark single notification as read", async () => {
    const originalFindOneAndUpdate = Notification.findOneAndUpdate;
    try {
      Notification.findOneAndUpdate = (async (_query: any, update: any) => ({
        _id: new Types.ObjectId(mockNotificationId),
        isRead: update.isRead,
        readAt: update.readAt,
      })) as any;

      const result = await notificationService.markAsRead(
        mockUserId,
        mockNotificationId
      );

      expect(result.isRead).toBe(true);
      expect(result.readAt).toBeDefined();
    } finally {
      Notification.findOneAndUpdate = originalFindOneAndUpdate;
    }
  });

  it("should mark all notifications as read", async () => {
    const originalUpdateMany = Notification.updateMany;
    try {
      Notification.updateMany = (async () => ({
        modifiedCount: 5,
      })) as any;

      const result = await notificationService.markAllAsRead(mockUserId);
      expect(result.modifiedCount).toBe(5);
    } finally {
      Notification.updateMany = originalUpdateMany;
    }
  });

  it("should delete notification", async () => {
    const originalFindOneAndDelete = Notification.findOneAndDelete;
    try {
      Notification.findOneAndDelete = (async () => ({
        _id: new Types.ObjectId(mockNotificationId),
      })) as any;

      const result = await notificationService.deleteNotification(
        mockUserId,
        mockNotificationId
      );
      expect(result.success).toBe(true);
    } finally {
      Notification.findOneAndDelete = originalFindOneAndDelete;
    }
  });
});
