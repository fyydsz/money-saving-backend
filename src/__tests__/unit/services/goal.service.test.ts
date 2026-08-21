import { describe, it, expect, afterEach } from "bun:test";
import { GoalService } from "../../../modules/goal/goal.service";
import { prisma } from "../../../db";

describe("GoalService", () => {
  const mockNotificationService: any = {
    createNotification: async () => ({ id: "notif-1" }),
  };
  const goalService = new GoalService(mockNotificationService);

  const originalGoalCreate = prisma.goal.create;
  const originalGoalFindMany = prisma.goal.findMany;
  const originalGoalFindUnique = prisma.goal.findUnique;
  const originalGoalUpdate = prisma.goal.update;
  const originalGoalDelete = prisma.goal.delete;

  const originalGoalMemberFindMany = prisma.goalMember.findMany;
  const originalGoalMemberFindUnique = prisma.goalMember.findUnique;
  const originalGoalMemberUpsert = prisma.goalMember.upsert;
  const originalGoalMemberUpdate = prisma.goalMember.update;

  const originalUserFindUnique = prisma.user.findUnique;
  const originalAccountFindFirst = prisma.bankAccount.findFirst;
  const originalAccountUpdate = prisma.bankAccount.update;
  const originalTransaction = prisma.$transaction;

  afterEach(() => {
    (prisma.goal as any).create = originalGoalCreate;
    (prisma.goal as any).findMany = originalGoalFindMany;
    (prisma.goal as any).findUnique = originalGoalFindUnique;
    (prisma.goal as any).update = originalGoalUpdate;
    (prisma.goal as any).delete = originalGoalDelete;

    (prisma.goalMember as any).findMany = originalGoalMemberFindMany;
    (prisma.goalMember as any).findUnique = originalGoalMemberFindUnique;
    (prisma.goalMember as any).upsert = originalGoalMemberUpsert;
    (prisma.goalMember as any).update = originalGoalMemberUpdate;

    (prisma.user as any).findUnique = originalUserFindUnique;
    (prisma.bankAccount as any).findFirst = originalAccountFindFirst;
    (prisma.bankAccount as any).update = originalAccountUpdate;
    (prisma as any).$transaction = originalTransaction;
  });

  describe("createGoal", () => {
    it("should create a personal goal successfully", async () => {
      (prisma.goal as any).create = async (args: any) => ({
        id: "goal-1",
        title: args.data.title,
        targetAmount: args.data.targetAmount,
        currentAmount: 0,
        isShared: false,
        creator: { name: "John", username: "john" },
        members: [{ role: "creator", status: "accepted", user: { name: "John" } }],
      });

      const goal = await goalService.createGoal("user-1", {
        title: "Buy Laptop",
        targetAmount: 15000000,
        category: "gadget",
      });

      expect(goal.id).toBe("goal-1");
      expect(goal.title).toBe("Buy Laptop");
      expect(goal.isShared).toBe(false);
    });
  });

  describe("getUserGoals", () => {
    it("should return user goals with calculated progressPercent", async () => {
      (prisma.goalMember as any).findMany = async () => [{ goalId: "goal-1" }];
      (prisma.goal as any).findMany = async () => [
        {
          id: "goal-1",
          title: "Vacation to Bali",
          targetAmount: 10000000,
          currentAmount: 5000000,
          members: [
            {
              role: "creator",
              status: "accepted",
              totalContributed: 5000000,
              user: { id: "user-1", name: "John", username: "john", image: null },
            },
          ],
        },
      ];

      const goals = await goalService.getUserGoals("user-1");
      expect(goals.length).toBe(1);
      expect(goals[0].progressPercent).toBe(50);
      expect(goals[0].members.length).toBe(1);
    });
  });

  describe("getGoalById", () => {
    it("should return goal details if user is a member", async () => {
      (prisma.goal as any).findUnique = async () => ({
        id: "goal-1",
        title: "Buy Car",
        targetAmount: 100000000,
        currentAmount: 25000000,
        members: [
          {
            userId: "user-1",
            role: "creator",
            status: "accepted",
            totalContributed: 25000000,
            user: { id: "user-1", name: "John", username: "john", image: null },
          },
        ],
      });

      const goal = await goalService.getGoalById("user-1", "goal-1");
      expect(goal.id).toBe("goal-1");
      expect(goal.progressPercent).toBe(25);
    });

    it("should throw error if user is not a member of the goal", async () => {
      (prisma.goal as any).findUnique = async () => ({
        id: "goal-1",
        members: [{ userId: "other-user" }],
      });

      let err: any;
      try {
        await goalService.getGoalById("user-1", "goal-1");
      } catch (e) {
        err = e;
      }

      expect(err).toBeDefined();
      expect(err.message).toContain("You do not have access to this Goal");
    });
  });

  describe("inviteMembers", () => {
    it("should allow creator to invite friends and mark goal as shared", async () => {
      (prisma.goal as any).findUnique = async () => ({
        id: "goal-1",
        creatorId: "user-1",
        title: "Japan Trip",
        isShared: false,
      });

      (prisma.user as any).findUnique = async () => ({
        name: "John",
        username: "john",
      });

      (prisma.goalMember as any).upsert = async (args: any) => ({
        id: "member-2",
        goalId: "goal-1",
        userId: "friend-1",
        status: "invited",
      });

      let updatedShared = false;
      (prisma.goal as any).update = async () => {
        updatedShared = true;
      };

      const result = await goalService.inviteMembers("user-1", "goal-1", ["friend-1"]);
      expect(result.invitedCount).toBe(1);
      expect(updatedShared).toBe(true);
    });

    it("should throw error if non-creator tries to invite friends", async () => {
      (prisma.goal as any).findUnique = async () => ({
        id: "goal-1",
        creatorId: "other-user",
      });

      let err: any;
      try {
        await goalService.inviteMembers("user-1", "goal-1", ["friend-1"]);
      } catch (e) {
        err = e;
      }

      expect(err).toBeDefined();
      expect(err.message).toContain("Only the Goal creator can invite friends");
    });
  });

  describe("respondGoalInvitation", () => {
    it("should accept invitation and update member status", async () => {
      (prisma.goalMember as any).findUnique = async () => ({
        id: "mem-1",
        status: "invited",
      });
      (prisma.goal as any).findUnique = async () => ({
        id: "goal-1",
        creatorId: "creator-1",
        title: "Japan Trip",
      });
      (prisma.user as any).findUnique = async () => ({
        name: "Friend",
        username: "friend",
      });
      (prisma.goalMember as any).update = async (args: any) => ({
        id: "mem-1",
        status: args.data.status,
      });

      const result = await goalService.respondGoalInvitation("user-1", "goal-1", "accept");
      expect(result.message).toContain("successfully joined this Goal");
      expect(result.member.status).toBe("accepted");
    });
  });

  describe("contributeToGoal", () => {
    it("should contribute to goal, deduct bank balance, and mark completed if target reached", async () => {
      (prisma.goalMember as any).findUnique = async () => ({
        id: "mem-1",
        status: "accepted",
        totalContributed: 4000000,
      });

      (prisma.goal as any).findUnique = async () => ({
        id: "goal-1",
        status: "active",
        currentAmount: 4000000,
        targetAmount: 5000000,
        isShared: false,
      });

      (prisma.bankAccount as any).findFirst = async () => ({
        id: "acc-1",
        userId: "user-1",
        balance: 2000000,
      });

      (prisma as any).$transaction = async (ops: any[]) => ops;

      const result = await goalService.contributeToGoal("user-1", "goal-1", 1000000, "acc-1");
      expect(result.currentAmount).toBe(5000000);
      expect(result.status).toBe("completed");
    });

    it("should throw error if contribution amount is non-positive", async () => {
      let err: any;
      try {
        await goalService.contributeToGoal("user-1", "goal-1", 0);
      } catch (e) {
        err = e;
      }

      expect(err).toBeDefined();
      expect(err.message).toContain("must be greater than 0");
    });

    it("should throw error if source account has insufficient balance", async () => {
      (prisma.goalMember as any).findUnique = async () => ({
        id: "mem-1",
        status: "accepted",
      });

      (prisma.goal as any).findUnique = async () => ({
        id: "goal-1",
        status: "active",
        currentAmount: 0,
        targetAmount: 1000000,
      });

      (prisma.bankAccount as any).findFirst = async () => ({
        id: "acc-1",
        userId: "user-1",
        balance: 50000,
      });

      let err: any;
      try {
        await goalService.contributeToGoal("user-1", "goal-1", 100000, "acc-1");
      } catch (e) {
        err = e;
      }

      expect(err).toBeDefined();
      expect(err.message).toContain("Insufficient account balance");
    });
  });

  describe("updateGoal & deleteGoal", () => {
    it("should update goal if creator", async () => {
      (prisma.goal as any).findUnique = async () => ({
        id: "goal-1",
        creatorId: "user-1",
      });
      (prisma.goal as any).update = async (args: any) => ({
        id: "goal-1",
        title: args.data.title,
      });

      const updated = await goalService.updateGoal("user-1", "goal-1", { title: "Updated Title" });
      expect(updated.title).toBe("Updated Title");
    });

    it("should delete goal if creator", async () => {
      (prisma.goal as any).findUnique = async () => ({
        id: "goal-1",
        creatorId: "user-1",
      });
      (prisma.goal as any).delete = async () => ({ id: "goal-1" });

      const result = await goalService.deleteGoal("user-1", "goal-1");
      expect(result.success).toBe(true);
    });
  });
});
