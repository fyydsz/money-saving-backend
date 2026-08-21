import { describe, it, expect, afterEach } from "bun:test";
import { NotificationService } from "../../../modules/notification/notification.service";
import { prisma } from "../../../db";

describe("NotificationService", () => {
  const notificationService = new NotificationService();

  const originalNotifCreate = prisma.notification.create;
  const originalNotifFindMany = prisma.notification.findMany;
  const originalNotifFindFirst = prisma.notification.findFirst;
  const originalNotifCount = prisma.notification.count;
  const originalNotifUpdate = prisma.notification.update;
  const originalNotifUpdateMany = prisma.notification.updateMany;
  const originalNotifDelete = prisma.notification.delete;

  afterEach(() => {
    (prisma.notification as any).create = originalNotifCreate;
    (prisma.notification as any).findMany = originalNotifFindMany;
    (prisma.notification as any).findFirst = originalNotifFindFirst;
    (prisma.notification as any).count = originalNotifCount;
    (prisma.notification as any).update = originalNotifUpdate;
    (prisma.notification as any).updateMany = originalNotifUpdateMany;
    (prisma.notification as any).delete = originalNotifDelete;
  });

  describe("createNotification", () => {
    it("should create notification with serialized data", async () => {
      (prisma.notification as any).create = async (args: any) => ({
        id: "notif-1",
        ...args.data,
      });

      const notif = await notificationService.createNotification({
        recipientId: "user-1",
        senderId: "user-2",
        type: "GOAL_INVITATION",
        title: "Goal Invitation",
        message: "You are invited!",
        data: { goalId: "goal-1" },
      });

      expect(notif.id).toBe("notif-1");
      expect(notif.recipientId).toBe("user-1");
      expect(notif.data).toBe(JSON.stringify({ goalId: "goal-1" }));
    });
  });

  describe("getUserNotifications", () => {
    it("should return notifications with parsed data and pagination", async () => {
      (prisma.notification as any).findMany = async () => [
        {
          id: "notif-1",
          recipientId: "user-1",
          title: "Goal Invitation",
          data: JSON.stringify({ goalId: "goal-1" }),
          isRead: false,
        },
      ];
      (prisma.notification as any).count = async (args: any) => {
        if (args.where?.isRead === false) return 1;
        return 1;
      };

      const result = await notificationService.getUserNotifications("user-1", {
        page: 1,
        limit: 10,
        unreadOnly: true,
      });

      expect(result.notifications.length).toBe(1);
      expect(result.notifications[0].data).toEqual({ goalId: "goal-1" });
      expect(result.unreadCount).toBe(1);
      expect(result.pagination.total).toBe(1);
    });
  });

  describe("getUnreadCount", () => {
    it("should count unread notifications", async () => {
      (prisma.notification as any).count = async () => 5;

      const count = await notificationService.getUnreadCount("user-1");
      expect(count).toBe(5);
    });
  });

  describe("markAsRead", () => {
    it("should mark a notification as read", async () => {
      (prisma.notification as any).findFirst = async () => ({
        id: "notif-1",
        recipientId: "user-1",
        isRead: false,
      });
      (prisma.notification as any).update = async () => ({
        id: "notif-1",
        isRead: true,
      });

      const updated = await notificationService.markAsRead("user-1", "notif-1");
      expect(updated.isRead).toBe(true);
    });

    it("should throw error if notification not found", async () => {
      (prisma.notification as any).findFirst = async () => null;

      let err: any;
      try {
        await notificationService.markAsRead("user-1", "non-existent");
      } catch (e) {
        err = e;
      }

      expect(err).toBeDefined();
      expect(err.message).toBe("Notification not found");
    });
  });

  describe("markAllAsRead", () => {
    it("should mark all unread notifications as read", async () => {
      (prisma.notification as any).updateMany = async () => ({ count: 4 });

      const result = await notificationService.markAllAsRead("user-1");
      expect(result.modifiedCount).toBe(4);
      expect(result.message).toContain("marked as read");
    });
  });

  describe("deleteNotification", () => {
    it("should delete notification successfully", async () => {
      (prisma.notification as any).findFirst = async () => ({
        id: "notif-1",
        recipientId: "user-1",
      });
      (prisma.notification as any).delete = async () => ({ id: "notif-1" });

      const result = await notificationService.deleteNotification("user-1", "notif-1");
      expect(result.success).toBe(true);
    });

    it("should throw error if notification not found", async () => {
      (prisma.notification as any).findFirst = async () => null;

      let err: any;
      try {
        await notificationService.deleteNotification("user-1", "non-existent");
      } catch (e) {
        err = e;
      }

      expect(err).toBeDefined();
      expect(err.message).toBe("Notification not found");
    });
  });
});
