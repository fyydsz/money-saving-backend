import { describe, it, expect, afterEach } from "bun:test";
import { SocialService } from "../../../modules/social/social.service";
import { prisma } from "../../../db";

describe("SocialService", () => {
  const mockNotificationService: any = {
    createNotification: async () => ({ id: "notif-1" }),
  };
  const socialService = new SocialService(mockNotificationService);

  const originalUserFindMany = prisma.user.findMany;
  const originalUserFindUnique = prisma.user.findUnique;
  const originalFriendshipFindMany = prisma.friendship.findMany;
  const originalFriendshipFindFirst = prisma.friendship.findFirst;
  const originalFriendshipCreate = prisma.friendship.create;
  const originalFriendshipUpdate = prisma.friendship.update;
  const originalFriendshipDelete = prisma.friendship.delete;

  afterEach(() => {
    (prisma.user as any).findMany = originalUserFindMany;
    (prisma.user as any).findUnique = originalUserFindUnique;
    (prisma.friendship as any).findMany = originalFriendshipFindMany;
    (prisma.friendship as any).findFirst = originalFriendshipFindFirst;
    (prisma.friendship as any).create = originalFriendshipCreate;
    (prisma.friendship as any).update = originalFriendshipUpdate;
    (prisma.friendship as any).delete = originalFriendshipDelete;
  });

  describe("searchUsers", () => {
    it("should return empty array for empty query string", async () => {
      const results = await socialService.searchUsers("user-1", "   ");
      expect(results).toEqual([]);
    });

    it("should search users and determine relationship status correctly", async () => {
      (prisma.user as any).findMany = async () => [
        {
          id: "user-2",
          name: "Alice",
          username: "alice",
          email: "alice@example.com",
          image: null,
        },
      ];
      (prisma.friendship as any).findMany = async () => [
        {
          id: "f-1",
          requesterId: "user-1",
          recipientId: "user-2",
          status: "pending",
        },
      ];

      const results = await socialService.searchUsers("user-1", "alice");
      expect(results.length).toBe(1);
      expect(results[0].relationshipStatus).toBe("pending_sent");
    });
  });

  describe("sendFriendRequest", () => {
    it("should throw error if sending friend request to self", async () => {
      let err: any;
      try {
        await socialService.sendFriendRequest("user-1", "user-1");
      } catch (e) {
        err = e;
      }

      expect(err).toBeDefined();
      expect(err.message).toContain("Cannot send friend request to yourself");
    });

    it("should throw error if target user does not exist", async () => {
      (prisma.user as any).findUnique = async (args: any) => {
        if (args.where.id === "user-1") return { name: "User 1", username: "user1" };
        return null;
      };

      let err: any;
      try {
        await socialService.sendFriendRequest("user-1", "non-existent");
      } catch (e) {
        err = e;
      }

      expect(err).toBeDefined();
      expect(err.message).toContain("Target user not found");
    });

    it("should send a new friend request successfully", async () => {
      (prisma.user as any).findUnique = async () => ({ name: "User", username: "user" });
      (prisma.friendship as any).findFirst = async () => null;
      (prisma.friendship as any).create = async (args: any) => ({
        id: "f-new",
        ...args.data,
      });

      const result = await socialService.sendFriendRequest("user-1", "user-2");
      expect(result.message).toContain("Friend request sent successfully");
      expect(result.friendship.status).toBe("pending");
    });
  });

  describe("respondFriendRequest", () => {
    it("should accept incoming friend request and send notification", async () => {
      (prisma.friendship as any).findFirst = async () => ({
        id: "f-1",
        requesterId: "user-sender",
        recipientId: "user-1",
        status: "pending",
      });
      (prisma.user as any).findUnique = async () => ({ name: "Receiver", username: "receiver" });
      (prisma.friendship as any).update = async (args: any) => ({
        id: "f-1",
        status: "accepted",
      });

      const result = await socialService.respondFriendRequest("user-1", "f-1", "accept");
      expect(result.message).toContain("Friend request accepted");
      expect(result.friendship.status).toBe("accepted");
    });

    it("should throw error if request not found or not recipient", async () => {
      (prisma.friendship as any).findFirst = async () => null;

      let err: any;
      try {
        await socialService.respondFriendRequest("user-1", "f-invalid", "accept");
      } catch (e) {
        err = e;
      }

      expect(err).toBeDefined();
      expect(err.message).toContain("Friend request not found or already processed");
    });
  });

  describe("getFriends & getFriendRequests", () => {
    it("should return list of accepted friends", async () => {
      (prisma.friendship as any).findMany = async () => [
        {
          id: "f-1",
          requesterId: "user-1",
          recipientId: "user-2",
          requesterRelType: "partner",
          requesterNickname: "Sweetheart",
          requester: { id: "user-1", name: "Me", username: "me" },
          recipient: { id: "user-2", name: "Partner", username: "partner" },
          updatedAt: new Date(),
        },
      ];

      const friends = await socialService.getFriends("user-1");
      expect(friends.length).toBe(1);
      expect(friends[0].friend.id).toBe("user-2");
      expect(friends[0].myCustom.relationshipType).toBe("partner");
      expect(friends[0].myCustom.nickname).toBe("Sweetheart");
    });

    it("should return incoming and outgoing pending friend requests", async () => {
      (prisma.friendship as any).findMany = async (args: any) => {
        if (args.where.recipientId) {
          return [
            {
              id: "f-in",
              requester: { id: "user-sender", name: "Sender", username: "sender" },
              createdAt: new Date(),
            },
          ];
        }
        return [
          {
            id: "f-out",
            recipient: { id: "user-target", name: "Target", username: "target" },
            createdAt: new Date(),
          },
        ];
      };

      const requests = await socialService.getFriendRequests("user-1");
      expect(requests.incoming.length).toBe(1);
      expect(requests.outgoing.length).toBe(1);
    });
  });

  describe("updateFriendCustomization & removeFriend", () => {
    it("should update relationship customization", async () => {
      (prisma.friendship as any).findFirst = async () => ({
        id: "f-1",
        requesterId: "user-1",
        recipientId: "user-2",
        status: "accepted",
      });
      (prisma.friendship as any).update = async (args: any) => ({
        requesterRelType: args.data.requesterRelType,
        requesterNickname: args.data.requesterNickname,
      });

      const result = await socialService.updateFriendCustomization("user-1", "user-2", {
        relationshipType: "bestfriend",
        nickname: "Bestie",
      });

      expect(result.customization.relationshipType).toBe("bestfriend");
      expect(result.customization.nickname).toBe("Bestie");
    });

    it("should remove friendship", async () => {
      (prisma.friendship as any).findFirst = async () => ({ id: "f-1" });
      (prisma.friendship as any).delete = async () => ({ id: "f-1" });

      const result = await socialService.removeFriend("user-1", "user-2");
      expect(result.success).toBe(true);
    });
  });
});
