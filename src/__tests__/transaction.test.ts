import { describe, it, expect } from "bun:test";
import { TransactionService, TransactionType } from "../modules/transaction/transaction.service";

describe("Transaction Service - Adjust Balance & Validation", () => {
  const transactionService = new TransactionService();

  it("should fail when updating a non-existent transaction", async () => {
    let error: any = null;
    try {
      await transactionService.updateTransaction("test-user-id", "non-existent-id", {
        amount: 20000,
        type: TransactionType.EXPENSE,
        adjustBalance: false,
      });
    } catch (err: any) {
      error = err;
    }

    expect(error).not.toBeNull();
    expect(error.message).toContain("Transaction not found");
  });

  it("should fail when deleting a non-existent transaction", async () => {
    let error: any = null;
    try {
      await transactionService.deleteTransaction("test-user-id", "non-existent-id", false);
    } catch (err: any) {
      error = err;
    }

    expect(error).not.toBeNull();
    expect(error.message).toContain("Transaction not found");
  });

  it("should fail when creating a transaction on a non-existent account", async () => {
    let error: any = null;
    try {
      await transactionService.createTransaction("test-user-id", {
        accountId: "non-existent-account",
        amount: 20000,
        type: TransactionType.EXPENSE,
        description: "Test Expense",
        category: "food_beverage",
        adjustBalance: false,
      });
    } catch (err: any) {
      error = err;
    }

    expect(error).not.toBeNull();
    expect(error.message).toContain("Account not found");
  });
});
