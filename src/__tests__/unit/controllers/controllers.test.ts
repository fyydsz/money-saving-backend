import { describe, it, expect, afterEach } from "bun:test";
import { Elysia } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { prisma } from "../../../db";
import { hashPassword } from "../../../utils/password";
import { authController } from "../../../modules/auth/auth.controller";
import { vaultController } from "../../../modules/vault/vault.controller";
import { categoryLabelController } from "../../../modules/category-label/category-label.controller";
import { transactionController } from "../../../modules/transaction/transaction.controller";
import { goalController } from "../../../modules/goal/goal.controller";
import { notificationController } from "../../../modules/notification/notification.controller";
import { socialController } from "../../../modules/social/social.controller";

describe("Controllers Integration Tests", () => {
  const secret = process.env.JWT_SECRET || "dev_secret_key_only";
  process.env.JWT_SECRET = secret;

  // Helper app to generate JWT tokens
  const tokenSigner = new Elysia().use(
    jwt({
      name: "jwt",
      secret,
    })
  ).get("/token", async ({ jwt }) => ({
    token: await jwt.sign({ id: "test-user-id", email: "test@example.com", name: "Test User" }),
  }));

  const getAuthHeader = async () => {
    const res = await tokenSigner.handle(new Request("http://localhost/token"));
    const { token } = await res.json();
    return { Authorization: `Bearer ${token}` };
  };

  describe("AuthController", () => {
    const app = new Elysia().use(authController);

    const origFindFirst = prisma.user.findFirst;
    const origCreate = prisma.user.create;

    afterEach(() => {
      (prisma.user as any).findFirst = origFindFirst;
      (prisma.user as any).create = origCreate;
    });

    it("POST /auth/register - should return 201 on successful registration", async () => {
      (prisma.user as any).findFirst = async () => null;
      (prisma.user as any).create = async (args: any) => ({
        id: "user-reg-1",
        name: args.data.name,
        email: args.data.email,
        username: args.data.username,
      });

      const res = await app.handle(
        new Request("http://localhost/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Alice",
            email: "alice@example.com",
            username: "alice123",
            password: "Password123!",
          }),
        })
      );

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.message).toBe("User registered successfully");
      expect(data.user.id).toBe("user-reg-1");
    });

    it("POST /auth/login - should return 200 with user & token", async () => {
      const hashed = await hashPassword("Password123!");
      (prisma.user as any).findFirst = async () => ({
        id: "user-reg-1",
        name: "Alice",
        email: "alice@example.com",
        username: "alice123",
        accounts: [{ providerId: "credential", password: hashed }],
      });

      const res = await app.handle(
        new Request("http://localhost/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            identifier: "alice123",
            password: "Password123!",
          }),
        })
      );

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.message).toBe("Login successful");
      expect(data.token).toBeDefined();
    });

    it("POST /auth/logout - should return 200", async () => {
      const res = await app.handle(
        new Request("http://localhost/auth/logout", {
          method: "POST",
        })
      );

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.message).toBe("Logout successful");
    });
  });

  describe("VaultController", () => {
    const app = new Elysia().use(vaultController);

    const origFindMany = prisma.bankAccount.findMany;
    const origFindFirst = prisma.bankAccount.findFirst;
    const origCount = prisma.bankAccount.count;
    const origCreate = prisma.bankAccount.create;

    afterEach(() => {
      (prisma.bankAccount as any).findMany = origFindMany;
      (prisma.bankAccount as any).findFirst = origFindFirst;
      (prisma.bankAccount as any).count = origCount;
      (prisma.bankAccount as any).create = origCreate;
    });

    it("GET /vaults/presets - should return vault presets publicly", async () => {
      const res = await app.handle(new Request("http://localhost/vaults/presets"));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.presets).toBeDefined();
      expect(data.presets.vaultTypes).toBeDefined();
    });

    it("GET /vaults - should return 401 without auth", async () => {
      const res = await app.handle(new Request("http://localhost/vaults"));
      expect(res.status).toBe(401);
    });

    it("GET /vaults - should return user vaults with auth", async () => {
      (prisma.bankAccount as any).findMany = async () => [
        {
          id: "v-1",
          userId: "test-user-id",
          name: "Main Vault",
          balance: 500000,
          transactions: [],
        },
      ];

      const headers = await getAuthHeader();
      const res = await app.handle(new Request("http://localhost/vaults", { headers }));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.vaults.length).toBe(1);
      expect(data.summary.totalBalance).toBe(500000);
    });
  });

  describe("CategoryLabelController", () => {
    const app = new Elysia().use(categoryLabelController);

    const origFindMany = prisma.category.findMany;
    const origLabelFindMany = prisma.label.findMany;

    afterEach(() => {
      (prisma.category as any).findMany = origFindMany;
      (prisma.label as any).findMany = origLabelFindMany;
    });

    it("GET /categories - should return default presets", async () => {
      const res = await app.handle(new Request("http://localhost/categories"));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.presets.length).toBeGreaterThan(0);
    });

    it("GET /labels - should return 401 without auth and 200 with auth", async () => {
      const unauthRes = await app.handle(new Request("http://localhost/labels"));
      expect(unauthRes.status).toBe(401);

      (prisma.label as any).findMany = async () => [
        { id: "lbl-1", name: "Savings", color: "#64748B" },
      ];

      const headers = await getAuthHeader();
      const authRes = await app.handle(new Request("http://localhost/labels", { headers }));
      expect(authRes.status).toBe(200);
      const data = await authRes.json();
      expect(data.labels.length).toBe(1);
    });
  });

  describe("TransactionController", () => {
    const app = new Elysia().use(transactionController);

    const origFindMany = prisma.transaction.findMany;
    const origCount = prisma.transaction.count;

    afterEach(() => {
      (prisma.transaction as any).findMany = origFindMany;
      (prisma.transaction as any).count = origCount;
    });

    it("GET /transactions - should return user transactions with auth", async () => {
      (prisma.transaction as any).findMany = async () => [];
      (prisma.transaction as any).count = async () => 0;

      const headers = await getAuthHeader();
      const res = await app.handle(new Request("http://localhost/transactions", { headers }));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.transactions).toEqual([]);
      expect(data.pagination.total).toBe(0);
    });

    it("GET /transactions/summary - should return summary breakdown", async () => {
      (prisma.transaction as any).findMany = async () => [
        { amount: 100000, category: "salary_income", type: "INCOME" },
      ];

      const headers = await getAuthHeader();
      const res = await app.handle(new Request("http://localhost/transactions/summary", { headers }));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.summary.totalIncome).toBe(100000);
    });
  });

  describe("GoalController", () => {
    const app = new Elysia().use(goalController);

    const origGoalMemberFindMany = prisma.goalMember.findMany;
    const origGoalFindMany = prisma.goal.findMany;

    afterEach(() => {
      (prisma.goalMember as any).findMany = origGoalMemberFindMany;
      (prisma.goal as any).findMany = origGoalFindMany;
    });

    it("GET /goals - should return user goals list", async () => {
      (prisma.goalMember as any).findMany = async () => [];
      (prisma.goal as any).findMany = async () => [];

      const headers = await getAuthHeader();
      const res = await app.handle(new Request("http://localhost/goals", { headers }));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.goals).toEqual([]);
    });

    it("GET /goals/invitations - should return pending invitations", async () => {
      (prisma.goalMember as any).findMany = async () => [];

      const headers = await getAuthHeader();
      const res = await app.handle(new Request("http://localhost/goals/invitations", { headers }));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.invitations).toEqual([]);
    });
  });

  describe("NotificationController", () => {
    const app = new Elysia().use(notificationController);

    const origNotifFindMany = prisma.notification.findMany;
    const origNotifCount = prisma.notification.count;

    afterEach(() => {
      (prisma.notification as any).findMany = origNotifFindMany;
      (prisma.notification as any).count = origNotifCount;
    });

    it("GET /notifications/unread-count - should return unread notification count", async () => {
      (prisma.notification as any).count = async () => 3;

      const headers = await getAuthHeader();
      const res = await app.handle(new Request("http://localhost/notifications/unread-count", { headers }));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.unreadCount).toBe(3);
    });
  });

  describe("SocialController", () => {
    const app = new Elysia().use(socialController);

    const origFriendshipFindMany = prisma.friendship.findMany;

    afterEach(() => {
      (prisma.friendship as any).findMany = origFriendshipFindMany;
    });

    it("GET /social/friends - should return friends list with auth", async () => {
      (prisma.friendship as any).findMany = async () => [];

      const headers = await getAuthHeader();
      const res = await app.handle(new Request("http://localhost/social/friends", { headers }));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.friends).toEqual([]);
    });

    it("GET /social/requests - should return friend requests", async () => {
      (prisma.friendship as any).findMany = async () => [];

      const headers = await getAuthHeader();
      const res = await app.handle(new Request("http://localhost/social/requests", { headers }));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.incoming).toEqual([]);
      expect(data.outgoing).toEqual([]);
    });
  });
});
