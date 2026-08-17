import { t } from "elysia";
import { RELATIONSHIP_TYPES } from "./social.service";

export const SearchUsersDto = t.Object({
  q: t.String({ minLength: 1, maxLength: 50 }),
});

export const SendFriendRequestDto = t.Object({
  targetUserId: t.String(),
});

export const RespondFriendRequestDto = t.Object({
  action: t.Union([t.Literal("accept"), t.Literal("decline")]),
});

export const UpdateRelationshipTagDto = t.Object({
  relationshipType: t.Union(
    RELATIONSHIP_TYPES.map((type: string) => t.Literal(type)) as any
  ),
  nickname: t.Optional(t.String({ maxLength: 50 })),
});
