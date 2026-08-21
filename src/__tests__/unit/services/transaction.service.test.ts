import { describe, it, expect, afterEach } from "bun:test";
import { TransactionService, TransactionType } from "../../../modules/transaction/transaction.service";
import { prisma } from "../../../db";

describe("TransactionService", () => {
  const transactionService = new TransactionService();

  const originalTxFindMany = prisma.transaction.findMany;
  const originalTxFindFirst = prisma.transaction.findFirst;
  const originalTxCount = prisma.transaction.count;
  const originalTxCreate = prisma.transaction.create;
  const originalTxUpdate = prisma.transaction.update;
  const originalTxDelete = prisma.transaction.delete;
  const originalAccountFindFirst = prisma.bankAccount.findFirst;
  const originalAccountUpdate = prisma.bankAccount.update;
  const originalLabelUpsert = prisma.label.upsert;
  const originalTransaction = prisma.$transaction;

  afterEach(() => {
    (prisma.transaction as any).findMany = originalTxFindMany;
    (prisma.transaction as any).findFirst = originalTxFindFirst;
    (prisma.transaction as any).count = originalTxCount;
    (prisma.transaction as any).create = originalTxCreate;
    (prisma.transaction as any).update = originalTxUpdate;
    (prisma.transaction as any).delete = originalTxDelete;
    (prisma.bankAccount as any).findFirst = originalAccountFindFirst;
    (prisma.bankAccount as any).update = originalAccountUpdate;
    (prisma.label as any).upsert = originalLabelUpsert;
    (prisma as any).$transaction = originalTransaction;
  });

  describe("getTransactions", () => {
    it("should return paginated transactions with filters applied", async () => {
      const mockTxs = [
        {
          id: "tx-1",
          userId: "user-1",
          amount: -50000,
          type: "EXPENSE",
          description: "Lunch",
          category: "food_beverage",
        },
      ];

      (prisma.transaction as any).findMany = async () => mockTxs;
      (prisma.transaction as any).count = async () => 1;

      const result = await transactionService.getTransactions("user-1", {
        page: "1",
        limit: "10",
        category: "food_beverage",
        search: "Lunch",
        startDate: "2026-08-01",
        endDate: "2026-08-31",
      });

      expect(result.transactions.length).toBe(1);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.totalPages).toBe(1);
    });
  });

  describe("getTransactionById", () => {
    it("should return transaction if found", async () => {
      const mockTx = {
        id: "tx-1",
        userId: "user-1",
        amount: -50000,
      };
      (prisma.transaction as any).findFirst = async () => mockTx;

      const result = await transactionService.getTransactionById("user-1", "tx-1");
      expect(result).toEqual(mockTx);
    });

    it("should throw error if transaction not found", async () => {
      (prisma.transaction as any).findFirst = async () => null;

      let err: any;
      try {
        await transactionService.getTransactionById("user-1", "non-existent");
      } catch (e) {
        err = e;
      }

      expect(err).toBeDefined();
      expect(err.message).toContain("Transaction not found or access denied");
    });
  });

  describe("createTransaction", () => {
    it("should throw error if account not found", async () => {
      (prisma.bankAccount as any).findFirst = async () => null;

      let err: any;
      try {
        await transactionService.createTransaction("user-1", {
          accountId: "non-existent-account",
          amount: 50000,
          description: "Snack",
        });
      } catch (e) {
        err = e;
      }

      expect(err).toBeDefined();
      expect(err.message).toContain("Account not found or access denied");
    });

    it("should throw error if expense makes account balance negative", async () => {
      (prisma.bankAccount as any).findFirst = async () => ({
        id: "acc-1",
        userId: "user-1",
        balance: 10000,
      });

      let err: any;
      try {
        await transactionService.createTransaction("user-1", {
          accountId: "acc-1",
          amount: 50000,
          type: TransactionType.EXPENSE,
          description: "Expensive Dinner",
        });
      } catch (e) {
        err = e;
      }

      expect(err).toBeDefined();
      expect(err.message).toContain("Nominal saldo tidak boleh bernilai negatif");
    });

    it("should create expense transaction, negate amount, and upsert labels", async () => {
      (prisma.bankAccount as any).findFirst = async () => ({
        id: "acc-1",
        userId: "user-1",
        balance: 200000,
      });

      let labelUpserted = false;
      (prisma.label as any).upsert = async () => {
        labelUpserted = true;
      };

      const mockSavedTx = {
        id: "tx-new",
        userId: "user-1",
        accountId: "acc-1",
        amount: -50000,
        type: TransactionType.EXPENSE,
        description: "Dinner",
        labels: ["Food"],
      };

      (prisma as any).$transaction = async (ops: any[]) => [mockSavedTx];

      const result = await transactionService.createTransaction("user-1", {
        accountId: "acc-1",
        amount: 50000,
        type: TransactionType.EXPENSE,
        description: "Dinner",
        labels: ["Food"],
      });

      expect(labelUpserted).toBe(true);
      expect(result.amount).toBe(-50000);
      expect(result.id).toBe("tx-new");
    });

    it("should create income transaction with positive amount", async () => {
      (prisma.bankAccount as any).findFirst = async () => ({
        id: "acc-1",
        userId: "user-1",
        balance: 100000,
      });

      const mockSavedTx = {
        id: "tx-income",
        userId: "user-1",
        accountId: "acc-1",
        amount: 500000,
        type: TransactionType.INCOME,
        description: "Salary",
      };

      (prisma as any).$transaction = async (ops: any[]) => [mockSavedTx];

      const result = await transactionService.createTransaction("user-1", {
        accountId: "acc-1",
        amount: 500000,
        type: TransactionType.INCOME,
        description: "Salary",
      });

      expect(result.amount).toBe(500000);
    });
  });

  describe("updateTransaction", () => {
    it("should update transaction on same account with balance delta adjustment", async () => {
      (prisma.transaction as any).findFirst = async () => ({
        id: "tx-1",
        userId: "user-1",
        accountId: "acc-1",
        amount: -50000,
        type: TransactionType.EXPENSE,
      });

      (prisma.bankAccount as any).findFirst = async () => ({
        id: "acc-1",
        userId: "user-1",
        balance: 100000,
      });

      const mockUpdated = {
        id: "tx-1",
        amount: -70000,
        type: TransactionType.EXPENSE,
      };

      (prisma as any).$transaction = async (ops: any[]) => [mockUpdated];

      const result = await transactionService.updateTransaction("user-1", "tx-1", {
        amount: 70000,
        type: TransactionType.EXPENSE,
      });

      expect(result.amount).toBe(-70000);
    });

    it("should throw error if update transaction is not found", async () => {
      (prisma.transaction as any).findFirst = async () => null;

      let err: any;
      try {
        await transactionService.updateTransaction("user-1", "non-existent", {
          amount: 10000,
        });
      } catch (e) {
        err = e;
      }

      expect(err).toBeDefined();
      expect(err.message).toBe("Transaction not found");
    });
  });

  describe("deleteTransaction", () => {
    it("should delete transaction and revert balance", async () => {
      (prisma.transaction as any).findFirst = async () => ({
        id: "tx-1",
        userId: "user-1",
        accountId: "acc-1",
        amount: -50000,
      });

      let txExecuted = false;
      (prisma as any).$transaction = async (ops: any[]) => {
        txExecuted = true;
        return [{}, {}];
      };

      const result = await transactionService.deleteTransaction("user-1", "tx-1", true);
      expect(txExecuted).toBe(true);
      expect(result.success).toBe(true);
    });

    it("should throw error if transaction to delete is not found", async () => {
      (prisma.transaction as any).findFirst = async () => null;

      let err: any;
      try {
        await transactionService.deleteTransaction("user-1", "non-existent", true);
      } catch (e) {
        err = e;
      }

      expect(err).toBeDefined();
      expect(err.message).toBe("Transaction not found");
    });
  });

  describe("getSummary", () => {
    it("should aggregate total income, total expense, net savings, and category breakdown", async () => {
      (prisma.transaction as any).findMany = async () => [
        { amount: 1000000, category: "salary_income", type: "INCOME" },
        { amount: -200000, category: "food_beverage", type: "EXPENSE" },
        { amount: -50000, category: "food_beverage", type: "EXPENSE" },
      ];

      const result = await transactionService.getSummary("user-1", {});

      expect(result.summary.totalIncome).toBe(1000000);
      expect(result.summary.totalExpense).toBe(250000);
      expect(result.summary.netSavings).toBe(750000);
      expect(result.summary.transactionCount).toBe(3);

      expect(result.categoryBreakdown.length).toBe(2);
      expect(result.categoryBreakdown[0].category).toBe("salary_income");
      expect(result.categoryBreakdown[1].category).toBe("food_beverage");
      expect(result.categoryBreakdown[1].totalAmount).toBe(250000);
    });
  });
});
