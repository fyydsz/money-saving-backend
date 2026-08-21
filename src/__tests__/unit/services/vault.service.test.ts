import { describe, it, expect, afterEach } from "bun:test";
import { VaultService } from "../../../modules/vault/vault.service";
import { prisma } from "../../../db";
import { AccountType, ProviderType } from "../../../constants/account.constant";

describe("VaultService", () => {
  const vaultService = new VaultService();

  const originalBankAccountFindMany = prisma.bankAccount.findMany;
  const originalBankAccountFindFirst = prisma.bankAccount.findFirst;
  const originalBankAccountCount = prisma.bankAccount.count;
  const originalBankAccountCreate = prisma.bankAccount.create;
  const originalBankAccountUpdate = prisma.bankAccount.update;
  const originalBankAccountUpdateMany = prisma.bankAccount.updateMany;
  const originalBankAccountDelete = prisma.bankAccount.delete;
  const originalTransactionDeleteMany = prisma.transaction.deleteMany;

  afterEach(() => {
    (prisma.bankAccount as any).findMany = originalBankAccountFindMany;
    (prisma.bankAccount as any).findFirst = originalBankAccountFindFirst;
    (prisma.bankAccount as any).count = originalBankAccountCount;
    (prisma.bankAccount as any).create = originalBankAccountCreate;
    (prisma.bankAccount as any).update = originalBankAccountUpdate;
    (prisma.bankAccount as any).updateMany = originalBankAccountUpdateMany;
    (prisma.bankAccount as any).delete = originalBankAccountDelete;
    (prisma.transaction as any).deleteMany = originalTransactionDeleteMany;
  });

  describe("getPresets", () => {
    it("should return vault types, providers, popular banks and ewallets", () => {
      const presets = vaultService.getPresets();
      expect(presets.vaultTypes).toBeDefined();
      expect(presets.providerTypes).toBeDefined();
      expect(presets.popularBanks).toBeDefined();
      expect(presets.popularEWallets).toBeDefined();
      expect(presets.popularBanks.length).toBeGreaterThan(0);
    });
  });

  describe("getUserVaults", () => {
    it("should calculate summary and monthly stats for user vaults", async () => {
      const now = new Date();
      (prisma.bankAccount as any).findMany = async () => [
        {
          id: "vault-1",
          userId: "user-1",
          name: "BCA Tabungan",
          accountType: "SAVINGS",
          providerType: "BANK",
          providerName: "BCA",
          balance: 1000000,
          currency: "IDR",
          color: "#3B82F6",
          isDefault: true,
          transactions: [
            {
              amount: -50000,
              type: "EXPENSE",
              date: now,
            },
            {
              amount: 200000,
              type: "INCOME",
              date: now,
            },
          ],
        },
      ];

      const result = await vaultService.getUserVaults("user-1");
      expect(result.summary.totalBalance).toBe(1000000);
      expect(result.summary.count).toBe(1);
      expect(result.vaults.length).toBe(1);
      expect(result.vaults[0].monthlyStats.length).toBe(6);
    });
  });

  describe("getVaultById", () => {
    it("should return vault with monthlyStats if found", async () => {
      (prisma.bankAccount as any).findFirst = async () => ({
        id: "vault-1",
        userId: "user-1",
        name: "BCA Tabungan",
        balance: 500000,
        transactions: [],
      });

      const vault = await vaultService.getVaultById("user-1", "vault-1");
      expect(vault.id).toBe("vault-1");
      expect(vault.balance).toBe(500000);
      expect(vault.monthlyStats).toBeDefined();
    });

    it("should throw error if vault not found", async () => {
      (prisma.bankAccount as any).findFirst = async () => null;

      let err: any;
      try {
        await vaultService.getVaultById("user-1", "non-existent");
      } catch (e) {
        err = e;
      }

      expect(err).toBeDefined();
      expect(err.message).toContain("Vault not found or access denied");
    });
  });

  describe("createVault", () => {
    it("should throw error when creating vault with negative balance", async () => {
      let err: any;
      try {
        await vaultService.createVault("user-1", {
          name: "Minus Vault",
          accountType: AccountType.SAVINGS,
          providerType: ProviderType.BANK,
          providerName: "BCA",
          balance: -10000,
        });
      } catch (e) {
        err = e;
      }

      expect(err).toBeDefined();
      expect(err.message).toContain("tidak boleh bernilai negatif");
    });

    it("should auto-set isDefault to true if it is the first vault", async () => {
      (prisma.bankAccount as any).count = async () => 0;
      (prisma.bankAccount as any).create = async (args: any) => ({
        id: "vault-first",
        ...args.data,
      });

      const created = await vaultService.createVault("user-1", {
        name: "First Account",
        accountType: AccountType.SAVINGS,
        providerType: ProviderType.BANK,
        providerName: "Mandiri",
        balance: 250000,
      });

      expect(created.isDefault).toBe(true);
      expect(created.balance).toBe(250000);
    });

    it("should reset other defaults if new vault is set as default", async () => {
      let updateManyCalled = false;
      (prisma.bankAccount as any).updateMany = async () => {
        updateManyCalled = true;
        return { count: 1 };
      };
      (prisma.bankAccount as any).create = async (args: any) => ({
        id: "vault-new-default",
        ...args.data,
      });

      const created = await vaultService.createVault("user-1", {
        name: "New Default Account",
        accountType: AccountType.SAVINGS,
        providerType: ProviderType.BANK,
        providerName: "BCA",
        balance: 100000,
        isDefault: true,
      });

      expect(updateManyCalled).toBe(true);
      expect(created.isDefault).toBe(true);
    });
  });

  describe("updateVault", () => {
    it("should update vault fields", async () => {
      (prisma.bankAccount as any).findFirst = async () => ({
        id: "vault-1",
        userId: "user-1",
        name: "Old Name",
        balance: 50000,
        transactions: [],
      });
      (prisma.bankAccount as any).update = async (args: any) => ({
        id: "vault-1",
        userId: "user-1",
        name: args.data.name,
        color: args.data.color,
      });

      const updated = await vaultService.updateVault("user-1", "vault-1", {
        name: "New Name",
        color: "#10B981",
      });

      expect(updated.name).toBe("New Name");
      expect(updated.color).toBe("#10B981");
    });
  });

  describe("deleteVault", () => {
    it("should delete associated transactions and vault", async () => {
      let txsDeleted = false;
      let vaultDeleted = false;

      (prisma.bankAccount as any).findFirst = async () => ({
        id: "vault-1",
        userId: "user-1",
        name: "Account to Delete",
        transactions: [],
      });
      (prisma.transaction as any).deleteMany = async () => {
        txsDeleted = true;
        return { count: 5 };
      };
      (prisma.bankAccount as any).delete = async () => {
        vaultDeleted = true;
        return { id: "vault-1" };
      };

      const result = await vaultService.deleteVault("user-1", "vault-1");
      expect(txsDeleted).toBe(true);
      expect(vaultDeleted).toBe(true);
      expect(result.success).toBe(true);
    });
  });
});
