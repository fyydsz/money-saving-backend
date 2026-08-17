import { t } from "elysia";
import { GOAL_CATEGORIES } from "./goal.service";

export const CreateGoalDto = t.Object({
  title: t.String({ minLength: 1, maxLength: 100 }),
  description: t.Optional(t.String({ maxLength: 500 })),
  targetAmount: t.Number({ minimum: 1 }),
  category: t.Optional(
    t.Union(GOAL_CATEGORIES.map((cat: string) => t.Literal(cat)) as any)
  ),
  icon: t.Optional(t.String({ maxLength: 10 })),
  deadline: t.Optional(t.String()),
  isShared: t.Optional(t.Boolean()),
  invitedFriendIds: t.Optional(t.Array(t.String())),
});

export const UpdateGoalDto = t.Object({
  title: t.Optional(t.String({ minLength: 1, maxLength: 100 })),
  description: t.Optional(t.String({ maxLength: 500 })),
  targetAmount: t.Optional(t.Number({ minimum: 1 })),
  category: t.Optional(
    t.Union(GOAL_CATEGORIES.map((cat: string) => t.Literal(cat)) as any)
  ),
  icon: t.Optional(t.String({ maxLength: 10 })),
  deadline: t.Optional(t.String()),
  status: t.Optional(
    t.Union([
      t.Literal("active"),
      t.Literal("completed"),
      t.Literal("cancelled"),
    ])
  ),
});

export const InviteGoalMembersDto = t.Object({
  friendIds: t.Array(t.String(), { minItems: 1 }),
});

export const RespondGoalInvitationDto = t.Object({
  action: t.Union([t.Literal("accept"), t.Literal("decline")]),
});

export const ContributeGoalDto = t.Object({
  amount: t.Number({ minimum: 1 }),
  accountId: t.Optional(t.String()),
});
