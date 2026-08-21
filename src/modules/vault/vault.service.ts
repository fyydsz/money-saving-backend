import { prisma } from "../../db";
import {
  AccountType,
  ProviderType,
  POPULAR_BANKS,
  POPULAR_EWALLETS,
} from "../../constants/account.constant";
import { CreateVaultInput, UpdateVaultInput } from "./vault.dto";
import type { BankAccount } from "@prisma/client";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export interface MonthlyStat {
  month: string;
  shortMonth: string;
  year: number;
  balance: number;
  income: number;
  expense: number;
  net: number;
}

function calculateMonthlyStats(
  currentBalance: number,
  transactions: Array<{ amount: number; type: string; date: Date }>
): MonthlyStat[] {
  const now = new Date();
  const rawMonths: Array<{
    month: string;
    shortMonth: string;
    year: number;
    monthIdx: number;
    income: number;
    expense: number;
    net: number;
    endOfMonth: Date;
    isCurrentMonth: boolean;
  }> = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const monthIdx = d.getMonth();
    const monthName = MONTH_NAMES[monthIdx];
    const endOfMonth = new Date(year, monthIdx + 1, 0, 23, 59, 59, 999);

    const monthTxs = transactions.filter((tx) => {
      const txDate = new Date(tx.date);
      return (
        txDate.getFullYear() === year && txDate.getMonth() === monthIdx
      );
    });

    let income = 0;
    let expense = 0;

    for (const tx of monthTxs) {
      const amt = Math.abs(tx.amount);
      if (tx.type === "INCOME" || tx.amount > 0) {
        income += amt;
      } else if (tx.type === "EXPENSE" || tx.amount < 0) {
        expense += amt;
      }
    }

    rawMonths.push({
      month: monthName,
      shortMonth: monthName.slice(0, 3),
      year,
      monthIdx,
      income,
      expense,
      net: income - expense,
      endOfMonth,
      isCurrentMonth: i === 0,
    });
  }

  // Backward calculation: for each month, balance = currentBalance - sum(transactions AFTER that month's end)
  // This correctly preserves the account's initial balance and produces accurate historical trajectory.
  const result: MonthlyStat[] = [];

  for (let i = 0; i < rawMonths.length; i++) {
    const m = rawMonths[i];

    if (m.isCurrentMonth) {
      // Current month: balance is simply the current balance
      result.push({
        month: m.month,
        shortMonth: m.shortMonth,
        year: m.year,
        balance: currentBalance,
        income: m.income,
        expense: m.expense,
        net: m.net,
      });
    } else {
      // Past months: check if any transactions exist up to this month's end
      // If none exist, show 0 (user can fill in via "Set Past Balance")
      // If transactions exist, use backward calc for accurate trajectory
      const hasTransactionsUpToMonth = transactions.some((tx) => {
        const txDate = new Date(tx.date);
        return txDate <= m.endOfMonth;
      });

      let monthBalance: number;

      if (!hasTransactionsUpToMonth) {
        // No transaction evidence up to this month — show 0
        monthBalance = 0;
      } else {
        // Backward calculation: currentBalance - sum(all tx net deltas AFTER this month's end)
        let subsequentDelta = 0;
        for (const tx of transactions) {
          const txDate = new Date(tx.date);
          if (txDate > m.endOfMonth) {
            const amt = Math.abs(tx.amount);
            if (tx.type === "INCOME" || tx.amount > 0) {
              subsequentDelta += amt;
            } else if (tx.type === "EXPENSE" || tx.amount < 0) {
              subsequentDelta -= amt;
            }
          }
        }
        monthBalance = currentBalance - subsequentDelta;
      }

      result.push({
        month: m.month,
        shortMonth: m.shortMonth,
        year: m.year,
        balance: monthBalance,
        income: m.income,
        expense: m.expense,
        net: m.net,
      });
    }
  }

  return result;
}

export class VaultService {
  async getUserVaults(userId: string) {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const vaults = await prisma.bankAccount.findMany({
      where: { userId },
      include: {
        transactions: {
          where: {
            date: { gte: sixMonthsAgo },
          },
          select: {
            amount: true,
            type: true,
            date: true,
          },
          orderBy: { date: "asc" },
        },
      },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    });

    const vaultsWithStats = vaults.map((acc) => {
      const { transactions, ...accData } = acc;
      const monthlyStats = calculateMonthlyStats(
        acc.balance || 0,
        transactions || []
      );
      return {
        ...accData,
        transactions: transactions || [],
        monthlyStats,
      };
    });

    // Calculate summary statistics
    const totalBalance = vaultsWithStats.reduce(
      (sum, acc) => sum + (acc.balance || 0),
      0
    );
    const count = vaultsWithStats.length;

    return {
      vaults: vaultsWithStats,
      summary: {
        totalBalance,
        count,
      },
    };
  }

  async getVaultById(
    userId: string,
    accountId: string
  ): Promise<any> {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const vault = await prisma.bankAccount.findFirst({
      where: { id: accountId, userId },
      include: {
        transactions: {
          where: {
            date: { gte: sixMonthsAgo },
          },
          select: {
            amount: true,
            type: true,
            date: true,
          },
          orderBy: { date: "asc" },
        },
      },
    });

    if (!vault) {
      throw new Error("Vault not found or access denied");
    }

    const { transactions, ...accData } = vault;
    const monthlyStats = calculateMonthlyStats(
      vault.balance || 0,
      transactions || []
    );

    return {
      ...accData,
      transactions: transactions || [],
      monthlyStats,
    };
  }

  async createVault(
    userId: string,
    data: CreateVaultInput
  ): Promise<BankAccount> {
    if (data.balance !== undefined && data.balance < 0) {
      throw new Error("Nominal saldo tidak boleh bernilai negatif (minimal 0)");
    }

    // If set as default, reset other vaults
    if (data.isDefault) {
      await prisma.bankAccount.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    } else {
      // If this is the first vault, set as default automatically
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

  async updateVault(
    userId: string,
    accountId: string,
    data: UpdateVaultInput
  ): Promise<BankAccount> {
    await this.getVaultById(userId, accountId);

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
        ...(data.providerType !== undefined && {
          providerType: data.providerType,
        }),
        ...(data.providerName !== undefined && {
          providerName: data.providerName,
        }),
        ...(data.currency !== undefined && { currency: data.currency }),
        ...(data.color !== undefined && { color: data.color }),
        ...(data.isDefault !== undefined && { isDefault: data.isDefault }),
      },
    });
  }

  async deleteVault(
    userId: string,
    accountId: string
  ): Promise<{ success: boolean; message: string }> {
    await this.getVaultById(userId, accountId);

    // Delete all transactions associated with this account
    await prisma.transaction.deleteMany({
      where: { userId, accountId },
    });

    await prisma.bankAccount.delete({
      where: { id: accountId },
    });

    return {
      success: true,
      message: "Vault and associated transaction history deleted successfully",
    };
  }

  getPresets() {
    return {
      vaultTypes: Object.values(AccountType),
      providerTypes: Object.values(ProviderType),
      popularBanks: POPULAR_BANKS,
      popularEWallets: POPULAR_EWALLETS,
    };
  }
}


