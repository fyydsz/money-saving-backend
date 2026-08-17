import { Types } from "mongoose";
import { Friendship, RelationshipType, User } from "../../db";
import { NotificationService } from "../notification/notification.service";

export class SocialService {
  private notificationService: NotificationService;

  constructor(notificationService?: NotificationService) {
    this.notificationService = notificationService || new NotificationService();
  }

  async searchUsers(currentUserId: string, query: string) {
    const cleanQuery = query.trim();
    if (!cleanQuery) return [];

    const currentUserObjId = new Types.ObjectId(currentUserId);

    // Search users matching username or name (exclude current user)
    const regex = new RegExp(cleanQuery, "i");
    const users = await User.find({
      _id: { $ne: currentUserObjId },
      $or: [{ username: regex }, { name: regex }, { email: regex }],
    })
      .select("name username email image")
      .limit(20)
      .lean();

    if (users.length === 0) return [];

    const userIds = users.map((u) => u._id);

    // Find all friendships involving current user and found users
    const friendships = await Friendship.find({
      $or: [
        { requester: currentUserObjId, recipient: { $in: userIds } },
        { recipient: currentUserObjId, requester: { $in: userIds } },
      ],
    }).lean();

    const friendshipMap = new Map<string, any>();
    for (const f of friendships) {
      const otherId = f.requester.toString() === currentUserId
        ? f.recipient.toString()
        : f.requester.toString();
      friendshipMap.set(otherId, f);
    }

    return users.map((userDoc) => {
      const uid = userDoc._id.toString();
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
        friendshipId = f._id.toString();
        if (f.status === "accepted") {
          relationshipStatus = "accepted";
          myCustom =
            f.requester.toString() === currentUserId
              ? f.requesterCustom
              : f.recipientCustom;
        } else if (f.status === "pending") {
          relationshipStatus =
            f.requester.toString() === currentUserId
              ? "pending_sent"
              : "pending_received";
        } else {
          relationshipStatus = f.status;
        }
      }

      return {
        id: uid,
        name: userDoc.name,
        username: userDoc.username,
        email: userDoc.email,
        image: (userDoc as any).image,
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

    const requesterObjId = new Types.ObjectId(requesterId);
    const targetObjId = new Types.ObjectId(targetUserId);

    const [requesterUser, targetUser] = await Promise.all([
      User.findById(requesterObjId).select("name username"),
      User.findById(targetObjId).select("name username"),
    ]);

    if (!targetUser) {
      throw new Error("Target user not found");
    }

    // Check existing friendship
    const existing = await Friendship.findOne({
      $or: [
        { requester: requesterObjId, recipient: targetObjId },
        { requester: targetObjId, recipient: requesterObjId },
      ],
    });

    if (existing) {
      if (existing.status === "accepted") {
        throw new Error("You are already friends");
      }
      if (existing.status === "pending") {
        if (existing.requester.toString() === requesterId) {
          throw new Error("Friend request has already been sent");
        } else {
          throw new Error(
            "This user has already sent you a friend request. Please accept their request."
          );
        }
      }
      // If declined before, reset to pending
      existing.requester = requesterObjId;
      existing.recipient = targetObjId;
      existing.status = "pending";
      await existing.save();

      // Send notification
      await this.notificationService.createNotification({
        recipient: targetObjId,
        sender: requesterObjId,
        type: "FRIEND_REQUEST",
        title: "Friend Request",
        message: `@${requesterUser?.username || "Someone"} wants to be friends with you`,
        data: { friendshipId: existing._id },
      });

      return {
        message: "Friend request sent successfully",
        friendship: existing,
      };
    }

    const friendship = new Friendship({
      requester: requesterObjId,
      recipient: targetObjId,
      status: "pending",
      requesterCustom: { relationshipType: "friend" },
      recipientCustom: { relationshipType: "friend" },
    });

    await friendship.save();

    // Send notification to recipient
    await this.notificationService.createNotification({
      recipient: targetObjId,
      sender: requesterObjId,
      type: "FRIEND_REQUEST",
      title: "Friend Request",
      message: `@${requesterUser?.username || "Someone"} wants to be friends with you`,
      data: { friendshipId: friendship._id },
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
    const friendship = await Friendship.findOne({
      _id: new Types.ObjectId(friendshipId),
      recipient: new Types.ObjectId(userId),
      status: "pending",
    });

    if (!friendship) {
      throw new Error("Friend request not found or already processed");
    }

    const recipientUser = await User.findById(userId).select("name username");

    if (action === "accept") {
      friendship.status = "accepted";
      await friendship.save();

      // Notify requester
      await this.notificationService.createNotification({
        recipient: friendship.requester,
        sender: new Types.ObjectId(userId),
        type: "FRIEND_ACCEPTED",
        title: "Friend Request Accepted",
        message: `@${recipientUser?.username || "Your friend"} accepted your friend request`,
        data: { friendshipId: friendship._id },
      });

      return {
        message: "Friend request accepted successfully",
        friendship,
      };
    } else {
      friendship.status = "declined";
      await friendship.save();

      return {
        message: "Friend request declined",
        friendship,
      };
    }
  }

  async getFriends(userId: string) {
    const userObjId = new Types.ObjectId(userId);

    const friendships = await Friendship.find({
      $or: [{ requester: userObjId }, { recipient: userObjId }],
      status: "accepted",
    })
      .populate("requester", "name username email image")
      .populate("recipient", "name username email image")
      .lean();

    return friendships.map((f: any) => {
      const isRequester = f.requester._id.toString() === userId;
      const friendProfile = isRequester ? f.recipient : f.requester;
      const myCustom = isRequester ? f.requesterCustom : f.recipientCustom;

      return {
        friendshipId: f._id.toString(),
        friend: {
          id: friendProfile._id.toString(),
          name: friendProfile.name,
          username: friendProfile.username,
          email: friendProfile.email,
          image: friendProfile.image,
        },
        myCustom: {
          relationshipType: myCustom?.relationshipType || "friend",
          nickname: myCustom?.nickname || "",
        },
        since: f.updatedAt || f.createdAt,
      };
    });
  }

  async getFriendRequests(userId: string) {
    const userObjId = new Types.ObjectId(userId);

    const [incoming, outgoing] = await Promise.all([
      Friendship.find({
        recipient: userObjId,
        status: "pending",
      })
        .populate("requester", "name username email image")
        .sort({ createdAt: -1 })
        .lean(),
      Friendship.find({
        requester: userObjId,
        status: "pending",
      })
        .populate("recipient", "name username email image")
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    return {
      incoming: incoming.map((f: any) => ({
        friendshipId: f._id.toString(),
        user: {
          id: f.requester._id.toString(),
          name: f.requester.name,
          username: f.requester.username,
          email: f.requester.email,
          image: f.requester.image,
        },
        createdAt: f.createdAt,
      })),
      outgoing: outgoing.map((f: any) => ({
        friendshipId: f._id.toString(),
        user: {
          id: f.recipient._id.toString(),
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
    const userObjId = new Types.ObjectId(userId);
    const friendObjId = new Types.ObjectId(friendUserId);

    const friendship = await Friendship.findOne({
      $or: [
        { requester: userObjId, recipient: friendObjId },
        { requester: friendObjId, recipient: userObjId },
      ],
      status: "accepted",
    });

    if (!friendship) {
      throw new Error("Friendship not found");
    }

    const isRequester = friendship.requester.toString() === userId;
    if (isRequester) {
      friendship.requesterCustom = {
        relationshipType: data.relationshipType,
        nickname: data.nickname?.trim(),
      };
    } else {
      friendship.recipientCustom = {
        relationshipType: data.relationshipType,
        nickname: data.nickname?.trim(),
      };
    }

    await friendship.save();

    return {
      message: "Relationship tag updated successfully",
      customization: isRequester
        ? friendship.requesterCustom
        : friendship.recipientCustom,
    };
  }

  async removeFriend(userId: string, friendUserId: string) {
    const userObjId = new Types.ObjectId(userId);
    const friendObjId = new Types.ObjectId(friendUserId);

    const result = await Friendship.findOneAndDelete({
      $or: [
        { requester: userObjId, recipient: friendObjId },
        { requester: friendObjId, recipient: userObjId },
      ],
    });

    if (!result) {
      throw new Error("Friendship not found");
    }

    return {
      message: "Friend removed successfully",
      success: true,
    };
  }
}
