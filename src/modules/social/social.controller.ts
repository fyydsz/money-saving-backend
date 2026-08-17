import { Elysia } from "elysia";
import { authGuard } from "../../plugins/auth.plugin";
import { SocialService } from "./social.service";
import {
  SearchUsersDto,
  SendFriendRequestDto,
  RespondFriendRequestDto,
  UpdateRelationshipTagDto,
} from "./social.dto";

const socialService = new SocialService();

export const socialController = new Elysia({ prefix: "/social" })
  .use(authGuard)
  .guard({ isAuth: true }, (app) =>
    app
      .get(
        "/search",
        async ({ user, query, set }: any) => {
          try {
            const results = await socialService.searchUsers(user.id, query.q);
            return { users: results };
          } catch (err: any) {
            set.status = 400;
            return { error: err.message };
          }
        },
        {
          query: SearchUsersDto,
        }
      )
      .get("/friends", async ({ user, set }: any) => {
        try {
          const friends = await socialService.getFriends(user.id);
          return { friends };
        } catch (err: any) {
          set.status = 400;
          return { error: err.message };
        }
      })
      .get("/requests", async ({ user, set }: any) => {
        try {
          const requests = await socialService.getFriendRequests(user.id);
          return requests;
        } catch (err: any) {
          set.status = 400;
          return { error: err.message };
        }
      })
      .post(
        "/requests",
        async ({ user, body, set }: any) => {
          try {
            const result = await socialService.sendFriendRequest(
              user.id,
              body.targetUserId
            );
            set.status = 201;
            return result;
          } catch (err: any) {
            set.status = 400;
            return { error: err.message };
          }
        },
        {
          body: SendFriendRequestDto,
        }
      )
      .patch(
        "/requests/:id",
        async ({ user, params: { id }, body, set }: any) => {
          try {
            const result = await socialService.respondFriendRequest(
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
          body: RespondFriendRequestDto,
        }
      )
      .patch(
        "/friends/:friendId/tag",
        async ({ user, params: { friendId }, body, set }: any) => {
          try {
            const result = await socialService.updateFriendCustomization(
              user.id,
              friendId,
              body
            );
            return result;
          } catch (err: any) {
            set.status = 400;
            return { error: err.message };
          }
        },
        {
          body: UpdateRelationshipTagDto,
        }
      )
      .delete("/friends/:friendId", async ({ user, params: { friendId }, set }: any) => {
        try {
          const result = await socialService.removeFriend(user.id, friendId);
          return result;
        } catch (err: any) {
          set.status = 400;
          return { error: err.message };
        }
      })
  );
