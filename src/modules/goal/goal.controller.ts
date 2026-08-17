import { Elysia, t } from "elysia";
import { authGuard } from "../../plugins/auth.plugin";
import { GoalService } from "./goal.service";
import {
  CreateGoalDto,
  UpdateGoalDto,
  InviteGoalMembersDto,
  RespondGoalInvitationDto,
  ContributeGoalDto,
} from "./goal.dto";

const goalService = new GoalService();

export const goalController = new Elysia({ prefix: "/goals" })
  .use(authGuard)
  .guard({ isAuth: true }, (app) =>
    app
      .get(
        "/",
        async ({ user, query, set }: any) => {
          try {
            const isShared =
              query.isShared === "true"
                ? true
                : query.isShared === "false"
                ? false
                : undefined;
            const goals = await goalService.getUserGoals(user.id, {
              status: query.status,
              isShared,
            });
            return { goals };
          } catch (err: any) {
            set.status = 400;
            return { error: err.message };
          }
        },
        {
          query: t.Object({
            status: t.Optional(t.String()),
            isShared: t.Optional(t.String()),
          }),
        }
      )
      .get("/invitations", async ({ user, set }: any) => {
        try {
          const invitations = await goalService.getGoalInvitations(user.id);
          return { invitations };
        } catch (err: any) {
          set.status = 400;
          return { error: err.message };
        }
      })
      .get("/:id", async ({ user, params: { id }, set }: any) => {
        try {
          const goal = await goalService.getGoalById(user.id, id);
          return { goal };
        } catch (err: any) {
          set.status = 404;
          return { error: err.message };
        }
      })
      .post(
        "/",
        async ({ user, body, set }: any) => {
          try {
            const goal = await goalService.createGoal(user.id, body);
            set.status = 201;
            return {
              message: "Goal created successfully",
              goal,
            };
          } catch (err: any) {
            set.status = 400;
            return { error: err.message };
          }
        },
        {
          body: CreateGoalDto,
        }
      )
      .put(
        "/:id",
        async ({ user, params: { id }, body, set }: any) => {
          try {
            const goal = await goalService.updateGoal(user.id, id, body);
            return {
              message: "Goal updated successfully",
              goal,
            };
          } catch (err: any) {
            set.status = 400;
            return { error: err.message };
          }
        },
        {
          body: UpdateGoalDto,
        }
      )
      .delete("/:id", async ({ user, params: { id }, set }: any) => {
        try {
          const result = await goalService.deleteGoal(user.id, id);
          return result;
        } catch (err: any) {
          set.status = 400;
          return { error: err.message };
        }
      })
      .post(
        "/:id/invite",
        async ({ user, params: { id }, body, set }: any) => {
          try {
            const result = await goalService.inviteMembers(
              user.id,
              id,
              body.friendIds
            );
            return result;
          } catch (err: any) {
            set.status = 400;
            return { error: err.message };
          }
        },
        {
          body: InviteGoalMembersDto,
        }
      )
      .patch(
        "/:id/invitation",
        async ({ user, params: { id }, body, set }: any) => {
          try {
            const result = await goalService.respondGoalInvitation(
              user.id,
              id,
              body.action
            );
            return result;
          } catch (err: any) {
            set.status = 400;
            return { error: err.message };
          }
        },
        {
          body: RespondGoalInvitationDto,
        }
      )
      .post(
        "/:id/contribute",
        async ({ user, params: { id }, body, set }: any) => {
          try {
            const result = await goalService.contributeToGoal(
              user.id,
              id,
              body.amount,
              body.accountId
            );
            return result;
          } catch (err: any) {
            set.status = 400;
            return { error: err.message };
          }
        },
        {
          body: ContributeGoalDto,
        }
      )
  );
