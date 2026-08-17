import { prisma } from "../../db";
import { NotificationService } from "../notification/notification.service";

export type RelationshipType =
  | "girlfriend"
  | "boyfriend"
  | "partner"
  | "spouse"
  | "bestfriend"
  | "family"
  | "friend";

export const RELATIONSHIP_TYPES: RelationshipType[] = [
  "girlfriend",
  "boyfriend",
  "partner",
  "spouse",
  "bestfriend",
  "family",
  "friend",
];

export class SocialService {
  private notificationService: NotificationService;

  constructor(notificationService?: NotificationService) {
    this.notificationService = notificationService || new NotificationService();
  }

  async searchUsers(currentUserId: string, query: string) {
    const cleanQuery = query.trim();
    if (!cleanQuery) return [];

    const users = await prisma.user.findMany({
      where: {
        id: { not: currentUserId },
        OR: [
          { username: { contains: cleanQuery, mode: "insensitive" } },
          { name: { contains: cleanQuery, mode: "insensitive" } },
          { email: { contains: cleanQuery, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        image: true,
      },
      take: 20,
    });

    if (users.length === 0) return [];

    const userIds = users.map((u) => u.id);

    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { requesterId: currentUserId, recipientId: { in: userIds } },
          { recipientId: currentUserId, requesterId: { in: userIds } },
        ],
      },
    });

    const friendshipMap = new Map<string, any>();
    for (const f of friendships) {
      const otherId = f.requesterId === currentUserId ? f.recipientId : f.requesterId;
      friendshipMap.set(otherId, f);
    }

    return users.map((userDoc) => {
      const uid = userDoc.id;
      const f = friendshipMap.get(uid);

      let relationshipStatus:
        | "none"
        | "pending_sent"
        | "pending_received"
        | "accepted"
        | "declined"
        | "blocked" = "none";
      let friendshipId: string | null = null;
      let myCustom: any = null;

      if (f) {
        friendshipId = f.id;
        if (f.status === "accepted") {
          relationshipStatus = "accepted";
          myCustom =
            f.requesterId === currentUserId
              ? {
                  relationshipType: f.requesterRelType,
                  nickname: f.requesterNickname,
                }
              : {
                  relationshipType: f.recipientRelType,
                  nickname: f.recipientNickname,
                };
        } else if (f.status === "pending") {
          relationshipStatus =
            f.requesterId === currentUserId ? "pending_sent" : "pending_received";
        } else {
          relationshipStatus = f.status as any;
        }
      }

      return {
        id: uid,
        name: userDoc.name,
        username: userDoc.username,
        email: userDoc.email,
        image: userDoc.image,
        friendshipId,
        relationshipStatus,
        myCustom,
      };
    });
  }

  async sendFriendRequest(requesterId: string, targetUserId: string) {
    if (requesterId === targetUserId) {
      throw new Error("Cannot send friend request to yourself");
    }

    const [requesterUser, targetUser] = await Promise.all([
      prisma.user.findUnique({ where: { id: requesterId }, select: { name: true, username: true } }),
      prisma.user.findUnique({ where: { id: targetUserId }, select: { name: true, username: true } }),
    ]);

    if (!targetUser) {
      throw new Error("Target user not found");
    }

    const existing = await prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId, recipientId: targetUserId },
          { requesterId: targetUserId, recipientId: requesterId },
        ],
      },
    });

    if (existing) {
      if (existing.status === "accepted") {
        throw new Error("You are already friends");
      }
      if (existing.status === "pending") {
        if (existing.requesterId === requesterId) {
          throw new Error("Friend request has already been sent");
        } else {
          throw new Error(
            "This user has already sent you a friend request. Please accept their request."
          );
        }
      }

      const updated = await prisma.friendship.update({
        where: { id: existing.id },
        data: {
          requesterId,
          recipientId: targetUserId,
          status: "pending",
        },
      });

      await this.notificationService.createNotification({
        recipientId: targetUserId,
        senderId: requesterId,
        type: "FRIEND_REQUEST",
        title: "Friend Request",
        message: `@${requesterUser?.username || "Someone"} wants to be friends with you`,
        data: { friendshipId: updated.id },
      });

      return {
        message: "Friend request sent successfully",
        friendship: updated,
      };
    }

    const friendship = await prisma.friendship.create({
      data: {
        requesterId,
        recipientId: targetUserId,
        status: "pending",
        requesterRelType: "friend",
        recipientRelType: "friend",
      },
    });

    await this.notificationService.createNotification({
      recipientId: targetUserId,
      senderId: requesterId,
      type: "FRIEND_REQUEST",
      title: "Friend Request",
      message: `@${requesterUser?.username || "Someone"} wants to be friends with you`,
      data: { friendshipId: friendship.id },
    });

    return {
      message: "Friend request sent successfully",
      friendship,
    };
  }

  async respondFriendRequest(
    userId: string,
    friendshipId: string,
    action: "accept" | "decline"
  ) {
    const friendship = await prisma.friendship.findFirst({
      where: {
        id: friendshipId,
        recipientId: userId,
        status: "pending",
      },
    });

    if (!friendship) {
      throw new Error("Friend request not found or already processed");
    }

    const recipientUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, username: true },
    });

    if (action === "accept") {
      const updated = await prisma.friendship.update({
        where: { id: friendshipId },
        data: { status: "accepted" },
      });

      await this.notificationService.createNotification({
        recipientId: friendship.requesterId,
        senderId: userId,
        type: "FRIEND_ACCEPTED",
        title: "Friend Request Accepted",
        message: `@${recipientUser?.username || "Your friend"} accepted your friend request`,
        data: { friendshipId: updated.id },
      });

      return {
        message: "Friend request accepted successfully",
        friendship: updated,
      };
    } else {
      const updated = await prisma.friendship.update({
        where: { id: friendshipId },
        data: { status: "declined" },
      });

      return {
        message: "Friend request declined",
        friendship: updated,
      };
    }
  }

  async getFriends(userId: string) {
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [{ requesterId: userId }, { recipientId: userId }],
        status: "accepted",
      },
      include: {
        requester: { select: { id: true, name: true, username: true, email: true, image: true } },
        recipient: { select: { id: true, name: true, username: true, email: true, image: true } },
      },
    });

    return friendships.map((f) => {
      const isRequester = f.requesterId === userId;
      const friendProfile = isRequester ? f.recipient : f.requester;

      return {
        friendshipId: f.id,
        friend: {
          id: friendProfile.id,
          name: friendProfile.name,
          username: friendProfile.username,
          email: friendProfile.email,
          image: friendProfile.image,
        },
        myCustom: {
          relationshipType: isRequester ? f.requesterRelType : f.recipientRelType,
          nickname: (isRequester ? f.requesterNickname : f.recipientNickname) || "",
        },
        since: f.updatedAt || f.createdAt,
      };
    });
  }

  async getFriendRequests(userId: string) {
    const [incoming, outgoing] = await Promise.all([
      prisma.friendship.findMany({
        where: {
          recipientId: userId,
          status: "pending",
        },
        include: {
          requester: { select: { id: true, name: true, username: true, email: true, image: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.friendship.findMany({
        where: {
          requesterId: userId,
          status: "pending",
        },
        include: {
          recipient: { select: { id: true, name: true, username: true, email: true, image: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return {
      incoming: incoming.map((f) => ({
        friendshipId: f.id,
        user: {
          id: f.requester.id,
          name: f.requester.name,
          username: f.requester.username,
          email: f.requester.email,
          image: f.requester.image,
        },
        createdAt: f.createdAt,
      })),
      outgoing: outgoing.map((f) => ({
        friendshipId: f.id,
        user: {
          id: f.recipient.id,
          name: f.recipient.name,
          username: f.recipient.username,
          email: f.recipient.email,
          image: f.recipient.image,
        },
        createdAt: f.createdAt,
      })),
    };
  }

  async updateFriendCustomization(
    userId: string,
    friendUserId: string,
    data: { relationshipType: RelationshipType; nickname?: string }
  ) {
    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: userId, recipientId: friendUserId },
          { requesterId: friendUserId, recipientId: userId },
        ],
        status: "accepted",
      },
    });

    if (!friendship) {
      throw new Error("Friendship not found");
    }

    const isRequester = friendship.requesterId === userId;

    const updated = await prisma.friendship.update({
      where: { id: friendship.id },
      data: isRequester
        ? {
            requesterRelType: data.relationshipType,
            requesterNickname: data.nickname?.trim() || null,
          }
        : {
            recipientRelType: data.relationshipType,
            recipientNickname: data.nickname?.trim() || null,
          },
    });

    return {
      message: "Relationship tag updated successfully",
      customization: {
        relationshipType: isRequester ? updated.requesterRelType : updated.recipientRelType,
        nickname: isRequester ? updated.requesterNickname : updated.recipientNickname,
      },
    };
  }

  async removeFriend(userId: string, friendUserId: string) {
    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: userId, recipientId: friendUserId },
          { requesterId: friendUserId, recipientId: userId },
        ],
      },
    });

    if (!friendship) {
      throw new Error("Friendship not found");
    }

    await prisma.friendship.delete({
      where: { id: friendship.id },
    });

    return {
      message: "Friend removed successfully",
      success: true,
    };
  }
}
