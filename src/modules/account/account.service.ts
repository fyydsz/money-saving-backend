import { prisma } from "../../db";
import {
  AccountType,
  ProviderType,
  POPULAR_BANKS,
  POPULAR_EWALLETS,
} from "../../constants/account.constant";
import { CreateAccountInput, UpdateAccountInput } from "./account.dto";
import type { BankAccount } from "@prisma/client";

export class AccountService {
  async getUserAccounts(userId: string) {
    const accounts = await prisma.bankAccount.findMany({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    });

    // Calculate summary statistics
    const totalBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
    const count = accounts.length;

    return {
      accounts,
      summary: {
        totalBalance,
        count,
      },
    };
  }

  async getAccountById(userId: string, accountId: string): Promise<BankAccount> {
    const account = await prisma.bankAccount.findFirst({
      where: { id: accountId, userId },
    });
    if (!account) {
      throw new Error("Account not found or access denied");
    }
    return account;
  }

  async createAccount(userId: string, data: CreateAccountInput): Promise<BankAccount> {
    // If set as default, reset other accounts
    if (data.isDefault) {
      await prisma.bankAccount.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    } else {
      // If this is the first account, set as default automatically
      const existingCount = await prisma.bankAccount.count({
        where: { userId },
      });
      if (existingCount === 0) {
        data.isDefault = true;
      }
    }

    return await prisma.bankAccount.create({
      data: {
        userId,
        name: data.name,
        accountType: data.accountType,
        providerType: data.providerType,
        providerName: data.providerName,
        balance: data.balance ?? 0,
        currency: data.currency ?? "IDR",
        color: data.color ?? "#3B82F6",
        isDefault: data.isDefault ?? false,
      },
    });
  }

  async updateAccount(
    userId: string,
    accountId: string,
    data: UpdateAccountInput
  ): Promise<BankAccount> {
    await this.getAccountById(userId, accountId);

    if (data.isDefault) {
      await prisma.bankAccount.updateMany({
        where: { userId, id: { not: accountId } },
        data: { isDefault: false },
      });
    }

    return await prisma.bankAccount.update({
      where: { id: accountId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.accountType !== undefined && { accountType: data.accountType }),
        ...(data.providerType !== undefined && { providerType: data.providerType }),
        ...(data.providerName !== undefined && { providerName: data.providerName }),
        ...(data.currency !== undefined && { currency: data.currency }),
        ...(data.color !== undefined && { color: data.color }),
        ...(data.isDefault !== undefined && { isDefault: data.isDefault }),
      },
    });
  }

  async deleteAccount(
    userId: string,
    accountId: string
  ): Promise<{ success: boolean; message: string }> {
    await this.getAccountById(userId, accountId);

    // Delete all transactions associated with this account
    await prisma.transaction.deleteMany({
      where: { userId, accountId },
    });

    await prisma.bankAccount.delete({
      where: { id: accountId },
    });

    return {
      success: true,
      message: "Account and associated transaction history deleted successfully",
    };
  }

  getPresets() {
    return {
      accountTypes: Object.values(AccountType),
      providerTypes: Object.values(ProviderType),
      popularBanks: POPULAR_BANKS,
      popularEWallets: POPULAR_EWALLETS,
    };
  }
}
