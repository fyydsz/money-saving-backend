import { Elysia } from "elysia";
import { authGuard } from "../../plugins/auth.plugin";
import { NotificationService } from "./notification.service";
import { NotificationQueryDto } from "./notification.dto";

const notificationService = new NotificationService();

export const notificationController = new Elysia({ prefix: "/notifications" })
  .use(authGuard)
  .guard({ isAuth: true }, (app) =>
    app
      .get(
        "/",
        async ({ user, query, set }: any) => {
          try {
            const result = await notificationService.getUserNotifications(
              user.id,
              {
                page: query.page,
                limit: query.limit,
                unreadOnly: query.unreadOnly === "true" || query.unreadOnly === true,
                type: query.type,
              }
            );
            return result;
          } catch (err: any) {
            set.status = 400;
            return { error: err.message };
          }
        },
        {
          query: NotificationQueryDto,
        }
      )
      .get("/unread-count", async ({ user, set }: any) => {
        try {
          const count = await notificationService.getUnreadCount(user.id);
          return { unreadCount: count };
        } catch (err: any) {
          set.status = 400;
          return { error: err.message };
        }
      })
      .patch("/:id/read", async ({ user, params: { id }, set }: any) => {
        try {
          const notification = await notificationService.markAsRead(user.id, id);
          return {
            message: "Notification marked as read",
            notification,
          };
        } catch (err: any) {
          set.status = 404;
          return { error: err.message };
        }
      })
      .patch("/read-all", async ({ user, set }: any) => {
        try {
          const result = await notificationService.markAllAsRead(user.id);
          return result;
        } catch (err: any) {
          set.status = 400;
          return { error: err.message };
        }
      })
      .delete("/:id", async ({ user, params: { id }, set }: any) => {
        try {
          const result = await notificationService.deleteNotification(user.id, id);
          return result;
        } catch (err: any) {
          set.status = 404;
          return { error: err.message };
        }
      })
  );
