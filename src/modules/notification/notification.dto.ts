import { t } from "elysia";

export const NotificationQueryDto = t.Object({
  page: t.Optional(t.Numeric({ default: 1 })),
  limit: t.Optional(t.Numeric({ default: 20 })),
  unreadOnly: t.Optional(t.BooleanString()),
  type: t.Optional(t.String()),
});
