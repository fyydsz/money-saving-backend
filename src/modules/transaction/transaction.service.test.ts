import { expect, describe, it } from "bun:test";
import { Types } from "mongoose";
import { TransactionService } from "./transaction.service";
import { TransactionType, Transaction, Account, Label } from "../../db";

describe("TransactionService Unit Tests", () => {
  const testUserId = "user_mock_tx_test";
  const mockAccountId = new Types.ObjectId().toString();
  const txService = new TransactionService();

  it("should create income transaction and increment account balance (+amount)", async () => {
    let balanceIncrement = 0;
    let savedLabels: string[] = [];

    const originalFindOneAccount = Account.findOne;
    const originalFindByIdAndUpdate = Account.findByIdAndUpdate;
    const originalSaveTx = Transaction.prototype.save;
    const originalPopulateTx = Transaction.prototype.populate;
    const originalUpsertLabel = Label.findOneAndUpdate;

    try {
      Account.findOne = (async () => ({
        _id: new Types.ObjectId(mockAccountId),
        userId: testUserId,
        name: "BCA",
        balance: 100000,
      })) as any;

      Account.findByIdAndUpdate = (async (_id: any, update: any) => {
        balanceIncrement = update.$inc.balance;
        return {};
      }) as any;

      Label.findOneAndUpdate = (async (query: any) => {
        savedLabels.push(query.name);
        return {};
      }) as any;

      Transaction.prototype.save = async function () {
        return this;
      };
      Transaction.prototype.populate = async function () {
        return this;
      } as any;

      const result = await txService.createTransaction(testUserId, {
        accountId: mockAccountId,
        amount: 500000,
        type: TransactionType.INCOME,
        description: "Freelance Salary",
        category: "side_income",
        labels: ["Freelance", "SideHustle"],
        notes: "Down payment",
      });

      expect(result.amount).toBe(500000);
      expect(result.type).toBe(TransactionType.INCOME);
      expect(balanceIncrement).toBe(500000);
      expect(savedLabels).toContain("Freelance");
      expect(savedLabels).toContain("SideHustle");
    } finally {
      Account.findOne = originalFindOneAccount;
      Account.findByIdAndUpdate = originalFindByIdAndUpdate;
      Transaction.prototype.save = originalSaveTx;
      Transaction.prototype.populate = originalPopulateTx;
      Label.findOneAndUpdate = originalUpsertLabel;
    }
  });

  it("should create expense transaction with negative amount and decrement account balance (-amount)", async () => {
    let balanceIncrement = 0;

    const originalFindOneAccount = Account.findOne;
    const originalFindByIdAndUpdate = Account.findByIdAndUpdate;
    const originalSaveTx = Transaction.prototype.save;
    const originalPopulateTx = Transaction.prototype.populate;

    try {
      Account.findOne = (async () => ({
        _id: new Types.ObjectId(mockAccountId),
        userId: testUserId,
        name: "BCA",
        balance: 500000,
      })) as any;

      Account.findByIdAndUpdate = (async (_id: any, update: any) => {
        balanceIncrement = update.$inc.balance;
        return {};
      }) as any;

      Transaction.prototype.save = async function () {
        return this;
      };
      Transaction.prototype.populate = async function () {
        return this;
      } as any;

      const result = await txService.createTransaction(testUserId, {
        accountId: mockAccountId,
        amount: 75000, // Passed as positive 75.000 with type EXPENSE
        type: TransactionType.EXPENSE,
        description: "Dinner",
        category: "food_beverage",
      });

      expect(result.amount).toBe(-75000);
      expect(result.type).toBe(TransactionType.EXPENSE);
      expect(balanceIncrement).toBe(-75000); // Balance decremented by 75.000
    } finally {
      Account.findOne = originalFindOneAccount;
      Account.findByIdAndUpdate = originalFindByIdAndUpdate;
      Transaction.prototype.save = originalSaveTx;
      Transaction.prototype.populate = originalPopulateTx;
    }
  });

  it("should update transaction and adjust account balance delta", async () => {
    let balanceDelta = 0;

    const existingTx: any = {
      _id: "tx123",
      userId: testUserId,
      accountId: new Types.ObjectId(mockAccountId),
      amount: -50000, // Old expense -50.000
      type: TransactionType.EXPENSE,
      description: "Lunch",
      category: "food_beverage",
      labels: [],
      save: async function () {
        return this;
      },
      populate: async function () {
        return this;
      },
    };

    const originalFindOneTx = Transaction.findOne;
    const originalFindOneAccount = Account.findOne;
    const originalFindByIdAndUpdate = Account.findByIdAndUpdate;

    try {
      Transaction.findOne = (async () => existingTx) as any;
      Account.findOne = (async () => ({
        _id: new Types.ObjectId(mockAccountId),
        userId: testUserId,
      })) as any;

      Account.findByIdAndUpdate = (async (_id: any, update: any) => {
        balanceDelta = update.$inc.balance;
        return {};
      }) as any;

      // Update expense from -50.000 to -80.000
      const updated = await txService.updateTransaction(testUserId, "tx123", {
        amount: 80000, // New expense: 80.000 -> -80.000
        type: TransactionType.EXPENSE,
      });

      expect(updated.amount).toBe(-80000);
      // Delta should be -80000 - (-50000) = -30000
      expect(balanceDelta).toBe(-30000);
    } finally {
      Transaction.findOne = originalFindOneTx;
      Account.findOne = originalFindOneAccount;
      Account.findByIdAndUpdate = originalFindByIdAndUpdate;
    }
  });

  it("should delete transaction and revert account balance", async () => {
    let balanceRevert = 0;

    const mockTx: any = {
      _id: "tx_delete",
      userId: testUserId,
      accountId: new Types.ObjectId(mockAccountId),
      amount: -45000, // Expense -45.000
      deleteOne: async () => {},
    };

    const originalFindOneTx = Transaction.findOne;
    const originalFindByIdAndUpdate = Account.findByIdAndUpdate;

    try {
      Transaction.findOne = (async () => mockTx) as any;
      Account.findByIdAndUpdate = (async (_id: any, update: any) => {
        balanceRevert = update.$inc.balance;
        return {};
      }) as any;

      const result = await txService.deleteTransaction(testUserId, "tx_delete");
      expect(result.success).toBe(true);
      // Revert should be -(-45000) = +45000
      expect(balanceRevert).toBe(45000);
    } finally {
      Transaction.findOne = originalFindOneTx;
      Account.findByIdAndUpdate = originalFindByIdAndUpdate;
    }
  });

  it("should aggregate financial summary correctly", async () => {
    const mockSummary = [
      {
        _id: null,
        totalIncome: 1000000,
        totalExpense: 250000,
        netSavings: 750000,
        transactionCount: 5,
      },
    ];

    const mockCategoryBreakdown = [
      {
        _id: { category: "food_beverage", type: "EXPENSE" },
        totalAmount: 150000,
        count: 3,
      },
    ];

    const originalAggregate = Transaction.aggregate;
    try {
      let callCount = 0;
      Transaction.aggregate = (async () => {
        callCount++;
        if (callCount === 1) return mockSummary;
        return mockCategoryBreakdown;
      }) as any;

      const result = await txService.getSummary(testUserId, {});
      expect(result.summary.totalIncome).toBe(1000000);
      expect(result.summary.totalExpense).toBe(250000);
      expect(result.summary.netSavings).toBe(750000);
      expect(result.categoryBreakdown.length).toBe(1);
      expect(result.categoryBreakdown[0].category).toBe("food_beverage");
      expect(result.categoryBreakdown[0].totalAmount).toBe(150000);
    } finally {
      Transaction.aggregate = originalAggregate;
    }
  });
});
