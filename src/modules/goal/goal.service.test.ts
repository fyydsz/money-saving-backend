import { expect, describe, it } from "bun:test";
import { Types } from "mongoose";
import { GoalService } from "./goal.service";
import { Goal, GoalMember, Account, User } from "../../db";

describe("GoalService Unit Tests", () => {
  const mockCreatorId = new Types.ObjectId().toString();
  const mockMemberId = new Types.ObjectId().toString();
  const mockGoalId = new Types.ObjectId().toString();
  const mockAccountId = new Types.ObjectId().toString();

  const mockNotifService: any = {
    createNotification: async () => ({}),
  };

  const goalService = new GoalService(mockNotifService);

  it("should create personal goal and register creator as member", async () => {
    let memberSaved = false;

    const originalGoalSave = Goal.prototype.save;
    const originalMemberSave = GoalMember.prototype.save;

    try {
      Goal.prototype.save = async function () {
        return this;
      };
      GoalMember.prototype.save = async function () {
        memberSaved = true;
        return this;
      };

      const goal = await goalService.createGoal(mockCreatorId, {
        title: "Buy Laptop",
        targetAmount: 15000000,
        category: "gadget",
        icon: "💻",
      });

      expect(goal.title).toBe("Buy Laptop");
      expect(goal.targetAmount).toBe(15000000);
      expect(goal.isShared).toBe(false);
      expect(memberSaved).toBe(true);
    } finally {
      Goal.prototype.save = originalGoalSave;
      GoalMember.prototype.save = originalMemberSave;
    }
  });

  it("should create shared goal and dispatch invitation notifications", async () => {
    let notifCount = 0;
    mockNotifService.createNotification = async () => {
      notifCount++;
      return {};
    };

    const originalGoalSave = Goal.prototype.save;
    const originalMemberSave = GoalMember.prototype.save;
    const originalFindMember = GoalMember.findOne;
    const originalFindUser = User.findById;

    try {
      Goal.prototype.save = async function () {
        return this;
      };
      GoalMember.prototype.save = async function () {
        return this;
      };
      GoalMember.findOne = (async () => null) as any;
      User.findById = ((id: any) => ({
        select: async () => ({ _id: id, username: "creator_user" }),
      })) as any;

      const goal = await goalService.createGoal(mockCreatorId, {
        title: "Holiday in Bali Together",
        targetAmount: 10000000,
        category: "travel",
        icon: "🏖️",
        isShared: true,
        invitedFriendIds: [mockMemberId],
      });

      expect(goal.isShared).toBe(true);
      expect(notifCount).toBe(1);
    } finally {
      Goal.prototype.save = originalGoalSave;
      GoalMember.prototype.save = originalMemberSave;
      GoalMember.findOne = originalFindMember;
      User.findById = originalFindUser;
    }
  });

  it("should accept goal invitation and update member status", async () => {
    let notifDispatched = false;
    mockNotifService.createNotification = async () => {
      notifDispatched = true;
      return {};
    };

    const originalFindMember = GoalMember.findOne;
    const originalFindGoal = Goal.findById;
    const originalFindUser = User.findById;

    try {
      const mockMemberDoc: any = {
        goalId: new Types.ObjectId(mockGoalId),
        userId: new Types.ObjectId(mockMemberId),
        status: "invited",
        save: async function () {
          return this;
        },
      };

      const mockGoalDoc: any = {
        _id: new Types.ObjectId(mockGoalId),
        title: "Holiday in Bali",
        creator: new Types.ObjectId(mockCreatorId),
      };

      GoalMember.findOne = (async () => mockMemberDoc) as any;
      Goal.findById = (async () => mockGoalDoc) as any;
      User.findById = ((id: any) => ({
        select: async () => ({ _id: id, username: "member_user" }),
      })) as any;

      const result = await goalService.respondGoalInvitation(
        mockMemberId,
        mockGoalId,
        "accept"
      );

      expect(result.member.status).toBe("accepted");
      expect(notifDispatched).toBe(true);
    } finally {
      GoalMember.findOne = originalFindMember;
      Goal.findById = originalFindGoal;
      User.findById = originalFindUser;
    }
  });

  it("should contribute to goal and debit account balance", async () => {
    const originalFindMember = GoalMember.findOne;
    const originalFindGoal = Goal.findById;
    const originalFindAccount = Account.findOne;
    const originalFindOtherMembers = GoalMember.find;
    const originalFindUser = User.findById;

    try {
      const mockMemberDoc: any = {
        goalId: new Types.ObjectId(mockGoalId),
        userId: new Types.ObjectId(mockMemberId),
        status: "accepted",
        totalContributed: 500000,
        save: async function () {
          return this;
        },
      };

      const mockGoalDoc: any = {
        _id: new Types.ObjectId(mockGoalId),
        title: "Holiday in Bali",
        targetAmount: 5000000,
        currentAmount: 1000000,
        status: "active",
        isShared: true,
        save: async function () {
          return this;
        },
      };

      const mockAccountDoc: any = {
        _id: new Types.ObjectId(mockAccountId),
        balance: 2000000,
        save: async function () {
          return this;
        },
      };

      GoalMember.findOne = (async () => mockMemberDoc) as any;
      Goal.findById = (async () => mockGoalDoc) as any;
      Account.findOne = (async () => mockAccountDoc) as any;
      GoalMember.find = (async () => []) as any;
      User.findById = ((id: any) => ({
        select: async () => ({ _id: id, username: "contributor" }),
      })) as any;

      const result = await goalService.contributeToGoal(
        mockMemberId,
        mockGoalId,
        500000,
        mockAccountId
      );

      expect(result.currentAmount).toBe(1500000);
      expect(result.totalContributed).toBe(1000000);
      expect(mockAccountDoc.balance).toBe(1500000); // 2.000.000 - 500.000
    } finally {
      GoalMember.findOne = originalFindMember;
      Goal.findById = originalFindGoal;
      Account.findOne = originalFindAccount;
      GoalMember.find = originalFindOtherMembers;
      User.findById = originalFindUser;
    }
  });
});
