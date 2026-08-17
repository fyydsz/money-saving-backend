import { Types } from "mongoose";
import {
  Goal,
  GoalMember,
  Friendship,
  User,
  GoalCategory,
  Account,
} from "../../db";
import { NotificationService } from "../notification/notification.service";

export interface CreateGoalParams {
  title: string;
  description?: string;
  targetAmount: number;
  category?: GoalCategory;
  icon?: string;
  deadline?: string;
  isShared?: boolean;
  invitedFriendIds?: string[];
}

export class GoalService {
  private notificationService: NotificationService;

  constructor(notificationService?: NotificationService) {
    this.notificationService = notificationService || new NotificationService();
  }

  async createGoal(creatorId: string, params: CreateGoalParams) {
    const creatorObjId = new Types.ObjectId(creatorId);

    const isShared = Boolean(params.isShared && params.invitedFriendIds && params.invitedFriendIds.length > 0);

    const goal = new Goal({
      title: params.title.trim(),
      description: params.description?.trim(),
      targetAmount: params.targetAmount,
      currentAmount: 0,
      category: params.category || "general",
      icon: params.icon || "🎯",
      deadline: params.deadline ? new Date(params.deadline) : undefined,
      creator: creatorObjId,
      isShared,
      status: "active",
    });

    await goal.save();

    // Register creator as accepted creator member
    const creatorMember = new GoalMember({
      goalId: goal._id,
      userId: creatorObjId,
      role: "creator",
      status: "accepted",
      totalContributed: 0,
    });
    await creatorMember.save();

    // If shared, invite friends
    if (isShared && params.invitedFriendIds && params.invitedFriendIds.length > 0) {
      await this.inviteMembers(creatorId, goal._id.toString(), params.invitedFriendIds, goal);
    }

    return goal;
  }

  async getUserGoals(
    userId: string,
    filter: { status?: string; isShared?: boolean } = {}
  ) {
    const userObjId = new Types.ObjectId(userId);

    // Find all goals where user is an accepted member
    const userMemberships = await GoalMember.find({
      userId: userObjId,
      status: "accepted",
    }).select("goalId");

    const goalIds = userMemberships.map((m) => m.goalId);

    const query: any = {
      _id: { $in: goalIds },
    };

    if (filter.status) {
      query.status = filter.status;
    }
    if (typeof filter.isShared === "boolean") {
      query.isShared = filter.isShared;
    }

    const goals = await Goal.find(query)
      .sort({ createdAt: -1 })
      .populate("creator", "name username email image")
      .lean();

    // Attach members details for each goal
    const result = await Promise.all(
      goals.map(async (g) => {
        const members = await GoalMember.find({ goalId: g._id })
          .populate("userId", "name username email image")
          .lean();

        const progressPercent = Math.min(
          100,
          Math.round((g.currentAmount / g.targetAmount) * 100)
        );

        return {
          ...g,
          progressPercent,
          members: members.map((m: any) => ({
            id: m.userId._id.toString(),
            name: m.userId.name,
            username: m.userId.username,
            image: m.userId.image,
            role: m.role,
            status: m.status,
            totalContributed: m.totalContributed,
          })),
        };
      })
    );

    return result;
  }

  async getGoalById(userId: string, goalId: string) {
    const userObjId = new Types.ObjectId(userId);
    const goalObjId = new Types.ObjectId(goalId);

    const goal = await Goal.findById(goalObjId)
      .populate("creator", "name username email image")
      .lean();

    if (!goal) {
      throw new Error("Goal not found");
    }

    const members = await GoalMember.find({ goalId: goalObjId })
      .populate("userId", "name username email image")
      .lean();

    const isMember = members.some((m: any) => m.userId._id.toString() === userId);
    if (!isMember) {
      throw new Error("You do not have access to this Goal");
    }

    const progressPercent = Math.min(
      100,
      Math.round((goal.currentAmount / goal.targetAmount) * 100)
    );

    return {
      ...goal,
      progressPercent,
      members: members.map((m: any) => ({
        id: m.userId._id.toString(),
        name: m.userId.name,
        username: m.userId.username,
        image: m.userId.image,
        role: m.role,
        status: m.status,
        totalContributed: m.totalContributed,
      })),
    };
  }

  async inviteMembers(
    userId: string,
    goalId: string,
    friendIds: string[],
    existingGoalDoc?: any
  ) {
    const goalObjId = new Types.ObjectId(goalId);
    const userObjId = new Types.ObjectId(userId);

    const goal = existingGoalDoc || (await Goal.findById(goalObjId));
    if (!goal) {
      throw new Error("Goal not found");
    }

    if (goal.creator.toString() !== userId) {
      throw new Error("Only the Goal creator can invite friends");
    }

    const creatorUser = await User.findById(userObjId).select("name username");

    const invitedMembers: any[] = [];

    for (const friendId of friendIds) {
      if (friendId === userId) continue;
      const friendObjId = new Types.ObjectId(friendId);

      // Check if already a member or invited
      const existingMember = await GoalMember.findOne({
        goalId: goalObjId,
        userId: friendObjId,
      });

      if (existingMember) {
        if (existingMember.status === "declined") {
          existingMember.status = "invited";
          await existingMember.save();
          invitedMembers.push(existingMember);
        }
      } else {
        const newMember = new GoalMember({
          goalId: goalObjId,
          userId: friendObjId,
          role: "member",
          status: "invited",
          totalContributed: 0,
        });
        await newMember.save();
        invitedMembers.push(newMember);
      }

      // Send notification
      await this.notificationService.createNotification({
        recipient: friendObjId,
        sender: userObjId,
        type: "GOAL_INVITATION",
        title: "Savings Goal Invitation 🎯",
        message: `@${creatorUser?.username || "Your friend"} invited you to save together for goal "${goal.title}"`,
        data: {
          goalId: goal._id,
          goalTitle: goal.title,
          targetAmount: goal.targetAmount,
        },
      });
    }

    // Ensure goal is flagged as shared
    if (!goal.isShared && invitedMembers.length > 0) {
      goal.isShared = true;
      await goal.save();
    }

    return {
      message: "Invitation sent successfully to friends",
      invitedCount: invitedMembers.length,
    };
  }

  async respondGoalInvitation(
    userId: string,
    goalId: string,
    action: "accept" | "decline"
  ) {
    const userObjId = new Types.ObjectId(userId);
    const goalObjId = new Types.ObjectId(goalId);

    const member = await GoalMember.findOne({
      goalId: goalObjId,
      userId: userObjId,
      status: "invited",
    });

    if (!member) {
      throw new Error("Goal invitation not found or already processed");
    }

    const [goal, user] = await Promise.all([
      Goal.findById(goalObjId),
      User.findById(userObjId).select("name username"),
    ]);

    if (!goal) {
      throw new Error("Goal not found");
    }

    if (action === "accept") {
      member.status = "accepted";
      await member.save();

      // Notify creator
      await this.notificationService.createNotification({
        recipient: goal.creator,
        sender: userObjId,
        type: "GOAL_ACCEPTED",
        title: "Goal Invitation Accepted",
        message: `@${user?.username || "Your friend"} joined goal "${goal.title}"! 🎉`,
        data: { goalId: goal._id },
      });

      return {
        message: "You have successfully joined this Goal!",
        member,
      };
    } else {
      member.status = "declined";
      await member.save();

      return {
        message: "Goal invitation declined",
        member,
      };
    }
  }

  async getGoalInvitations(userId: string) {
    const userObjId = new Types.ObjectId(userId);

    const pendingMemberships = await GoalMember.find({
      userId: userObjId,
      status: "invited",
    })
      .populate({
        path: "goalId",
        populate: { path: "creator", select: "name username email image" },
      })
      .sort({ createdAt: -1 })
      .lean();

    return pendingMemberships
      .filter((m: any) => m.goalId)
      .map((m: any) => ({
        invitationId: m._id.toString(),
        goal: {
          id: m.goalId._id.toString(),
          title: m.goalId.title,
          description: m.goalId.description,
          targetAmount: m.goalId.targetAmount,
          currentAmount: m.goalId.currentAmount,
          category: m.goalId.category,
          icon: m.goalId.icon,
          deadline: m.goalId.deadline,
          creator: m.goalId.creator,
        },
        invitedAt: m.createdAt,
      }));
  }

  async contributeToGoal(
    userId: string,
    goalId: string,
    amount: number,
    accountId?: string
  ) {
    if (amount <= 0) {
      throw new Error("Contribution amount must be greater than 0");
    }

    const userObjId = new Types.ObjectId(userId);
    const goalObjId = new Types.ObjectId(goalId);

    const member = await GoalMember.findOne({
      goalId: goalObjId,
      userId: userObjId,
      status: "accepted",
    });

    if (!member) {
      throw new Error("You are not an active member of this Goal");
    }

    const goal = await Goal.findById(goalObjId);
    if (!goal) {
      throw new Error("Goal not found");
    }

    if (goal.status !== "active") {
      throw new Error("This Goal is no longer active");
    }

    // If accountId provided, verify and debit account balance
    if (accountId) {
      const account = await Account.findOne({
        _id: new Types.ObjectId(accountId),
        userId: userObjId,
      });

      if (!account) {
        throw new Error("Source account not found");
      }

      if (account.balance < amount) {
        throw new Error("Insufficient account balance for goal contribution");
      }

      account.balance -= amount;
      await account.save();
    }

    // Increment goal total & member contribution atomically
    goal.currentAmount = (goal.currentAmount || 0) + amount;
    if (goal.currentAmount >= goal.targetAmount) {
      goal.status = "completed";
    }
    await goal.save();

    member.totalContributed = (member.totalContributed || 0) + amount;
    await member.save();

    // If shared goal, notify other members
    if (goal.isShared) {
      const otherMembers = await GoalMember.find({
        goalId: goalObjId,
        userId: { $ne: userObjId },
        status: "accepted",
      });

      const contributorUser = await User.findById(userObjId).select(
        "name username"
      );

      for (const other of otherMembers) {
        await this.notificationService.createNotification({
          recipient: other.userId,
          sender: userObjId,
          type: "GOAL_CONTRIBUTION",
          title: "New Goal Contribution",
          message: `@${contributorUser?.username || "Your friend"} contributed ${amount.toLocaleString("en-US")} to "${goal.title}"`,
          data: {
            goalId: goal._id,
            amount,
            goalTitle: goal.title,
          },
        });
      }
    }

    return {
      message: "Goal contribution successful!",
      currentAmount: goal.currentAmount,
      targetAmount: goal.targetAmount,
      totalContributed: member.totalContributed,
      status: goal.status,
    };
  }

  async updateGoal(userId: string, goalId: string, data: any) {
    const goal = await Goal.findById(new Types.ObjectId(goalId));
    if (!goal) {
      throw new Error("Goal not found");
    }

    if (goal.creator.toString() !== userId) {
      throw new Error("Only the Goal creator can update Goal details");
    }

    if (data.title !== undefined) goal.title = data.title.trim();
    if (data.description !== undefined) goal.description = data.description?.trim();
    if (data.targetAmount !== undefined) goal.targetAmount = data.targetAmount;
    if (data.category !== undefined) goal.category = data.category;
    if (data.icon !== undefined) goal.icon = data.icon;
    if (data.deadline !== undefined) {
      goal.deadline = data.deadline ? new Date(data.deadline) : undefined;
    }
    if (data.status !== undefined) goal.status = data.status;

    await goal.save();
    return goal;
  }

  async deleteGoal(userId: string, goalId: string) {
    const goalObjId = new Types.ObjectId(goalId);
    const goal = await Goal.findById(goalObjId);

    if (!goal) {
      throw new Error("Goal not found");
    }

    if (goal.creator.toString() !== userId) {
      throw new Error("Only the Goal creator can delete this Goal");
    }

    await Promise.all([
      Goal.findByIdAndDelete(goalObjId),
      GoalMember.deleteMany({ goalId: goalObjId }),
    ]);

    return {
      message: "Goal deleted successfully",
      success: true,
    };
  }
}
