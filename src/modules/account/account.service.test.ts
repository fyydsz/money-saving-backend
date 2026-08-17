import { expect, describe, it, beforeEach } from "bun:test";
import { AccountService } from "./account.service";
import { AccountType, ProviderType } from "../../constants/account.constant";
import { Account, Transaction } from "../../db";

describe("AccountService Unit Tests", () => {
  const testUserId = "user_mock_account_test";
  const accountService = new AccountService();

  it("should get presets for account types, providers, popular banks and ewallets", () => {
    const presets = accountService.getPresets();
    expect(presets.accountTypes).toContain(AccountType.SAVINGS);
    expect(presets.accountTypes).toContain(AccountType.CREDIT_CARD);
    expect(presets.accountTypes).toContain(AccountType.DEPOSIT);
    expect(presets.accountTypes).toContain(AccountType.PAYLATER);
    expect(presets.providerTypes).toContain(ProviderType.BANK);
    expect(presets.providerTypes).toContain(ProviderType.E_WALLET);
    expect(presets.popularBanks).toContain("BCA");
    expect(presets.popularEWallets).toContain("GoPay");
  });

  it("should create an account with default balance 0", async () => {
    // Mock Account model methods
    const originalCountDocuments = Account.countDocuments;
    const originalSave = Account.prototype.save;

    try {
      Account.countDocuments = (async () => 0) as any;
      Account.prototype.save = async function () {
        return this;
      };

      const account = await accountService.createAccount(testUserId, {
        name: "BCA Main Savings",
        accountType: AccountType.SAVINGS,
        providerType: ProviderType.BANK,
        providerName: "BCA",
      });

      expect(account.name).toBe("BCA Main Savings");
      expect(account.accountType).toBe(AccountType.SAVINGS);
      expect(account.providerType).toBe(ProviderType.BANK);
      expect(account.providerName).toBe("BCA");
      expect(account.balance).toBe(0);
      expect(account.currency).toBe("IDR");
      expect(account.isDefault).toBe(true); // First account becomes default
    } finally {
      Account.countDocuments = originalCountDocuments;
      Account.prototype.save = originalSave;
    }
  });

  it("should calculate summary total balance correctly when getting user accounts", async () => {
    const mockAccounts = [
      { _id: "acc1", name: "BCA", balance: 1500000, isDefault: true },
      { _id: "acc2", name: "GoPay", balance: 250000, isDefault: false },
    ];

    const originalFind = Account.find;
    try {
      Account.find = (() => ({
        sort: async () => mockAccounts,
      })) as any;

      const result = await accountService.getUserAccounts(testUserId);
      expect(result.accounts.length).toBe(2);
      expect(result.summary.count).toBe(2);
      expect(result.summary.totalBalance).toBe(1750000);
    } finally {
      Account.find = originalFind;
    }
  });

  it("should throw an error if account is not found", async () => {
    const originalFindOne = Account.findOne;
    try {
      Account.findOne = (async () => null) as any;

      expect(
        accountService.getAccountById(testUserId, "invalid_id")
      ).rejects.toThrow("Account not found or access denied");
    } finally {
      Account.findOne = originalFindOne;
    }
  });

  it("should update account fields correctly", async () => {
    const mockAccount: any = {
      _id: "acc123",
      userId: testUserId,
      name: "BCA Old",
      accountType: AccountType.SAVINGS,
      providerType: ProviderType.BANK,
      providerName: "BCA",
      balance: 100000,
      isDefault: false,
      save: async function () {
        return this;
      },
    };

    const originalFindOne = Account.findOne;
    const originalUpdateMany = Account.updateMany;
    try {
      Account.findOne = (async () => mockAccount) as any;
      Account.updateMany = (async () => ({})) as any;

      const updated = await accountService.updateAccount(testUserId, "acc123", {
        name: "BCA Priority New",
        isDefault: true,
      });

      expect(updated.name).toBe("BCA Priority New");
      expect(updated.isDefault).toBe(true);
    } finally {
      Account.findOne = originalFindOne;
      Account.updateMany = originalUpdateMany;
    }
  });

  it("should delete account and cascade delete related transactions", async () => {
    let deletedTransactions = false;
    let deletedAccount = false;

    const mockAccount: any = {
      _id: "acc_to_delete",
      userId: testUserId,
      deleteOne: async () => {
        deletedAccount = true;
      },
    };

    const originalFindOne = Account.findOne;
    const originalDeleteMany = Transaction.deleteMany;
    try {
      Account.findOne = (async () => mockAccount) as any;
      Transaction.deleteMany = (async () => {
        deletedTransactions = true;
      }) as any;

      const result = await accountService.deleteAccount(testUserId, "acc_to_delete");
      expect(result.success).toBe(true);
      expect(deletedAccount).toBe(true);
      expect(deletedTransactions).toBe(true);
    } finally {
      Account.findOne = originalFindOne;
      Transaction.deleteMany = originalDeleteMany;
    }
  });
});
