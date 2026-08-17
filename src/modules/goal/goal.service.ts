import { prisma } from "../../db";
import { NotificationService } from "../notification/notification.service";

export type GoalCategory =
  | "couple"
  | "travel"
  | "emergency"
  | "gadget"
  | "investment"
  | "education"
  | "general";

export const GOAL_CATEGORIES: GoalCategory[] = [
  "couple",
  "travel",
  "emergency",
  "gadget",
  "investment",
  "education",
  "general",
];

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
    const isShared = Boolean(
      params.isShared && params.invitedFriendIds && params.invitedFriendIds.length > 0
    );

    const goal = await prisma.goal.create({
      data: {
        title: params.title.trim(),
        description: params.description?.trim(),
        targetAmount: params.targetAmount,
        currentAmount: 0,
        category: params.category || "general",
        icon: params.icon || "🎯",
        deadline: params.deadline ? new Date(params.deadline) : undefined,
        creatorId,
        isShared,
        status: "active",
        members: {
          create: {
            userId: creatorId,
            role: "creator",
            status: "accepted",
            totalContributed: 0,
          },
        },
      },
      include: {
        creator: {
          select: { name: true, username: true, email: true, image: true },
        },
        members: {
          include: {
            user: { select: { name: true, username: true, email: true, image: true } },
          },
        },
      },
    });

    // If shared, invite friends
    if (isShared && params.invitedFriendIds && params.invitedFriendIds.length > 0) {
      await this.inviteMembers(creatorId, goal.id, params.invitedFriendIds, goal);
    }

    return goal;
  }

  async getUserGoals(
    userId: string,
    filter: { status?: string; isShared?: boolean } = {}
  ) {
    const userMemberships = await prisma.goalMember.findMany({
      where: {
        userId,
        status: "accepted",
      },
      select: { goalId: true },
    });

    const goalIds = userMemberships.map((m) => m.goalId);

    const where: any = {
      id: { in: goalIds },
    };

    if (filter.status) {
      where.status = filter.status;
    }
    if (typeof filter.isShared === "boolean") {
      where.isShared = filter.isShared;
    }

    const goals = await prisma.goal.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        creator: {
          select: { name: true, username: true, email: true, image: true },
        },
        members: {
          include: {
            user: { select: { id: true, name: true, username: true, email: true, image: true } },
          },
        },
      },
    });

    return goals.map((g) => {
      const progressPercent = Math.min(
        100,
        Math.round((g.currentAmount / g.targetAmount) * 100)
      );

      return {
        ...g,
        progressPercent,
        members: g.members.map((m) => ({
          id: m.user.id,
          name: m.user.name,
          username: m.user.username,
          image: m.user.image,
          role: m.role,
          status: m.status,
          totalContributed: m.totalContributed,
        })),
      };
    });
  }

  async getGoalById(userId: string, goalId: string) {
    const goal = await prisma.goal.findUnique({
      where: { id: goalId },
      include: {
        creator: {
          select: { name: true, username: true, email: true, image: true },
        },
        members: {
          include: {
            user: { select: { id: true, name: true, username: true, email: true, image: true } },
          },
        },
      },
    });

    if (!goal) {
      throw new Error("Goal not found");
    }

    const isMember = goal.members.some((m) => m.userId === userId);
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
      members: goal.members.map((m) => ({
        id: m.user.id,
        name: m.user.name,
        username: m.user.username,
        image: m.user.image,
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
    const goal = existingGoalDoc || (await prisma.goal.findUnique({ where: { id: goalId } }));
    if (!goal) {
      throw new Error("Goal not found");
    }

    if (goal.creatorId !== userId) {
      throw new Error("Only the Goal creator can invite friends");
    }

    const creatorUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, username: true },
    });

    const invitedMembers: any[] = [];

    for (const friendId of friendIds) {
      if (friendId === userId) continue;

      const member = await prisma.goalMember.upsert({
        where: {
          goalId_userId: { goalId, userId: friendId },
        },
        update: {
          status: "invited",
        },
        create: {
          goalId,
          userId: friendId,
          role: "member",
          status: "invited",
          totalContributed: 0,
        },
      });

      invitedMembers.push(member);

      // Send notification
      await this.notificationService.createNotification({
        recipientId: friendId,
        senderId: userId,
        type: "GOAL_INVITATION",
        title: "Savings Goal Invitation 🎯",
        message: `@${creatorUser?.username || "Your friend"} invited you to save together for goal "${goal.title}"`,
        data: {
          goalId: goal.id,
          goalTitle: goal.title,
          targetAmount: goal.targetAmount,
        },
      });
    }

    if (!goal.isShared && invitedMembers.length > 0) {
      await prisma.goal.update({
        where: { id: goalId },
        data: { isShared: true },
      });
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
    const member = await prisma.goalMember.findUnique({
      where: {
        goalId_userId: { goalId, userId },
      },
    });

    if (!member || member.status !== "invited") {
      throw new Error("Goal invitation not found or already processed");
    }

    const [goal, user] = await Promise.all([
      prisma.goal.findUnique({ where: { id: goalId } }),
      prisma.user.findUnique({ where: { id: userId }, select: { name: true, username: true } }),
    ]);

    if (!goal) {
      throw new Error("Goal not found");
    }

    if (action === "accept") {
      const updatedMember = await prisma.goalMember.update({
        where: { id: member.id },
        data: { status: "accepted" },
      });

      await this.notificationService.createNotification({
        recipientId: goal.creatorId,
        senderId: userId,
        type: "GOAL_ACCEPTED",
        title: "Goal Invitation Accepted",
        message: `@${user?.username || "Your friend"} joined goal "${goal.title}"! 🎉`,
        data: { goalId: goal.id },
      });

      return {
        message: "You have successfully joined this Goal!",
        member: updatedMember,
      };
    } else {
      const updatedMember = await prisma.goalMember.update({
        where: { id: member.id },
        data: { status: "declined" },
      });

      return {
        message: "Goal invitation declined",
        member: updatedMember,
      };
    }
  }

  async getGoalInvitations(userId: string) {
    const pendingMemberships = await prisma.goalMember.findMany({
      where: {
        userId,
        status: "invited",
      },
      include: {
        goal: {
          include: {
            creator: { select: { name: true, username: true, email: true, image: true } },
          },
        },
      },
      orderBy: { joinedAt: "desc" },
    });

    return pendingMemberships
      .filter((m) => m.goal)
      .map((m) => ({
        invitationId: m.id,
        goal: {
          id: m.goal.id,
          title: m.goal.title,
          description: m.goal.description,
          targetAmount: m.goal.targetAmount,
          currentAmount: m.goal.currentAmount,
          category: m.goal.category,
          icon: m.goal.icon,
          deadline: m.goal.deadline,
          creator: m.goal.creator,
        },
        invitedAt: m.joinedAt,
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

    const member = await prisma.goalMember.findUnique({
      where: {
        goalId_userId: { goalId, userId },
      },
    });

    if (!member || member.status !== "accepted") {
      throw new Error("You are not an active member of this Goal");
    }

    const goal = await prisma.goal.findUnique({ where: { id: goalId } });
    if (!goal) {
      throw new Error("Goal not found");
    }

    if (goal.status !== "active") {
      throw new Error("This Goal is no longer active");
    }

    // If accountId provided, verify balance
    if (accountId) {
      const account = await prisma.bankAccount.findFirst({
        where: { id: accountId, userId },
      });

      if (!account) {
        throw new Error("Source account not found");
      }

      if (account.balance < amount) {
        throw new Error("Insufficient account balance for goal contribution");
      }
    }

    const newCurrentAmount = goal.currentAmount + amount;
    const isCompleted = newCurrentAmount >= goal.targetAmount;
    const newStatus = isCompleted ? "completed" : goal.status;

    const operations: any[] = [
      prisma.goal.update({
        where: { id: goalId },
        data: {
          currentAmount: { increment: amount },
          status: newStatus,
        },
      }),
      prisma.goalMember.update({
        where: { id: member.id },
        data: {
          totalContributed: { increment: amount },
        },
      }),
    ];

    if (accountId) {
      operations.push(
        prisma.bankAccount.update({
          where: { id: accountId },
          data: { balance: { decrement: amount } },
        })
      );
    }

    await prisma.$transaction(operations);

    // If shared goal, notify other members
    if (goal.isShared) {
      const otherMembers = await prisma.goalMember.findMany({
        where: {
          goalId,
          userId: { not: userId },
          status: "accepted",
        },
      });

      const contributorUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, username: true },
      });

      for (const other of otherMembers) {
        await this.notificationService.createNotification({
          recipientId: other.userId,
          senderId: userId,
          type: "GOAL_CONTRIBUTION",
          title: "New Goal Contribution",
          message: `@${contributorUser?.username || "Your friend"} contributed ${amount.toLocaleString("en-US")} to "${goal.title}"`,
          data: {
            goalId: goal.id,
            amount,
            goalTitle: goal.title,
          },
        });
      }
    }

    return {
      message: "Goal contribution successful!",
      currentAmount: newCurrentAmount,
      targetAmount: goal.targetAmount,
      totalContributed: member.totalContributed + amount,
      status: newStatus,
    };
  }

  async updateGoal(userId: string, goalId: string, data: any) {
    const goal = await prisma.goal.findUnique({ where: { id: goalId } });
    if (!goal) {
      throw new Error("Goal not found");
    }

    if (goal.creatorId !== userId) {
      throw new Error("Only the Goal creator can update Goal details");
    }

    return await prisma.goal.update({
      where: { id: goalId },
      data: {
        ...(data.title !== undefined && { title: data.title.trim() }),
        ...(data.description !== undefined && { description: data.description?.trim() }),
        ...(data.targetAmount !== undefined && { targetAmount: data.targetAmount }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.icon !== undefined && { icon: data.icon }),
        ...(data.deadline !== undefined && {
          deadline: data.deadline ? new Date(data.deadline) : null,
        }),
        ...(data.status !== undefined && { status: data.status }),
      },
    });
  }

  async deleteGoal(userId: string, goalId: string) {
    const goal = await prisma.goal.findUnique({ where: { id: goalId } });
    if (!goal) {
      throw new Error("Goal not found");
    }

    if (goal.creatorId !== userId) {
      throw new Error("Only the Goal creator can delete this Goal");
    }

    await prisma.goal.delete({
      where: { id: goalId },
    });

    return {
      message: "Goal deleted successfully",
      success: true,
    };
  }
}
