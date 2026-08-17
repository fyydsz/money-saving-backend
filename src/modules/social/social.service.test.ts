import { expect, describe, it } from "bun:test";
import { Types } from "mongoose";
import { SocialService } from "./social.service";
import { Friendship, User } from "../../db";

describe("SocialService Unit Tests", () => {
  const mockRequesterId = new Types.ObjectId().toString();
  const mockRecipientId = new Types.ObjectId().toString();
  const mockFriendshipId = new Types.ObjectId().toString();

  const mockNotifService: any = {
    createNotification: async () => ({}),
  };

  const socialService = new SocialService(mockNotifService);

  it("should search users and return relationship status", async () => {
    const originalFindUser = User.find;
    const originalFindFriendship = Friendship.find;

    try {
      User.find = (() => ({
        select: () => ({
          limit: () => ({
            lean: async () => [
              {
                _id: new Types.ObjectId(mockRecipientId),
                name: "Siti",
                username: "siti_cantik",
                email: "siti@example.com",
              },
            ],
          }),
        }),
      })) as any;

      Friendship.find = (() => ({
        lean: async () => [
          {
            _id: new Types.ObjectId(mockFriendshipId),
            requester: new Types.ObjectId(mockRequesterId),
            recipient: new Types.ObjectId(mockRecipientId),
            status: "accepted",
            requesterCustom: { relationshipType: "girlfriend", nickname: "Ayang" },
            recipientCustom: { relationshipType: "boyfriend" },
          },
        ],
      })) as any;

      const results = await socialService.searchUsers(mockRequesterId, "siti");
      expect(results.length).toBe(1);
      expect(results[0].username).toBe("siti_cantik");
      expect(results[0].relationshipStatus).toBe("accepted");
      expect(results[0].myCustom.relationshipType).toBe("girlfriend");
      expect(results[0].myCustom.nickname).toBe("Ayang");
    } finally {
      User.find = originalFindUser;
      Friendship.find = originalFindFriendship;
    }
  });

  it("should send friend request successfully and dispatch notification", async () => {
    let notifDispatched = false;
    mockNotifService.createNotification = async () => {
      notifDispatched = true;
      return {};
    };

    const originalFindUser = User.findById;
    const originalFindOneFriendship = Friendship.findOne;
    const originalSaveFriendship = Friendship.prototype.save;

    try {
      User.findById = ((id: any) => ({
        select: async () => ({
          _id: id,
          name: "User Test",
          username: "usertest",
        }),
      })) as any;

      Friendship.findOne = (async () => null) as any;
      Friendship.prototype.save = async function () {
        return this;
      };

      const result = await socialService.sendFriendRequest(
        mockRequesterId,
        mockRecipientId
      );

      expect(result.message).toContain("sent successfully");
      expect(result.friendship.status).toBe("pending");
      expect(notifDispatched).toBe(true);
    } finally {
      User.findById = originalFindUser;
      Friendship.findOne = originalFindOneFriendship;
      Friendship.prototype.save = originalSaveFriendship;
    }
  });

  it("should prevent sending friend request to oneself", async () => {
    expect(
      socialService.sendFriendRequest(mockRequesterId, mockRequesterId)
    ).rejects.toThrow("Cannot send friend request to yourself");
  });

  it("should accept friend request and notify requester", async () => {
    let notifDispatched = false;
    mockNotifService.createNotification = async () => {
      notifDispatched = true;
      return {};
    };

    const originalFindOne = Friendship.findOne;
    const originalFindUser = User.findById;

    try {
      const mockDoc: any = {
        _id: new Types.ObjectId(mockFriendshipId),
        requester: new Types.ObjectId(mockRequesterId),
        recipient: new Types.ObjectId(mockRecipientId),
        status: "pending",
        save: async function () {
          return this;
        },
      };

      Friendship.findOne = (async () => mockDoc) as any;
      User.findById = ((id: any) => ({
        select: async () => ({
          _id: id,
          username: "recipient_user",
        }),
      })) as any;

      const result = await socialService.respondFriendRequest(
        mockRecipientId,
        mockFriendshipId,
        "accept"
      );

      expect(result.friendship.status).toBe("accepted");
      expect(notifDispatched).toBe(true);
    } finally {
      Friendship.findOne = originalFindOne;
      User.findById = originalFindUser;
    }
  });

  it("should update personal custom relationship tag and nickname independently", async () => {
    const originalFindOne = Friendship.findOne;

    try {
      const mockDoc: any = {
        _id: new Types.ObjectId(mockFriendshipId),
        requester: new Types.ObjectId(mockRequesterId),
        recipient: new Types.ObjectId(mockRecipientId),
        status: "accepted",
        requesterCustom: { relationshipType: "friend", nickname: "" },
        recipientCustom: { relationshipType: "friend", nickname: "" },
        save: async function () {
          return this;
        },
      };

      Friendship.findOne = (async () => mockDoc) as any;

      const result = await socialService.updateFriendCustomization(
        mockRequesterId,
        mockRecipientId,
        {
          relationshipType: "girlfriend",
          nickname: "Ayang Siti 🥰",
        }
      );

      expect(result.customization.relationshipType).toBe("girlfriend");
      expect(result.customization.nickname).toBe("Ayang Siti 🥰");
      expect(mockDoc.requesterCustom.relationshipType).toBe("girlfriend");
      // Recipient's side must stay unaffected
      expect(mockDoc.recipientCustom.relationshipType).toBe("friend");
    } finally {
      Friendship.findOne = originalFindOne;
    }
  });
});
