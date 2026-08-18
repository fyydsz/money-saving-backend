import { prisma } from "../../db";
import {
  CreateTransactionInput,
  UpdateTransactionInput,
  TransactionQueryInput,
} from "./transaction.dto";
import type { Transaction } from "@prisma/client";

export enum TransactionType {
  EXPENSE = "EXPENSE",
  INCOME = "INCOME",
  TRANSFER = "TRANSFER",
}

export class TransactionService {
  async getTransactions(userId: string, query: TransactionQueryInput) {
    const where: any = { userId };

    if (query.accountId) {
      where.accountId = query.accountId;
    }

    if (query.category) {
      where.category = query.category;
    }

    if (query.label) {
      where.labels = { has: query.label };
    }

    if (query.type) {
      where.type = query.type;
    }

    if (query.search) {
      where.OR = [
        { description: { contains: query.search, mode: "insensitive" } },
        { notes: { contains: query.search, mode: "insensitive" } },
      ];
    }

    if (query.startDate || query.endDate) {
      where.date = {};
      if (query.startDate) {
        where.date.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        const end = new Date(query.endDate);
        if (query.endDate.length <= 10) {
          end.setHours(23, 59, 59, 999);
        }
        where.date.lte = end;
      }
    }

    const page = Math.max(1, parseInt(query.page || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || "20", 10)));
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          account: {
            select: {
              name: true,
              accountType: true,
              providerType: true,
              providerName: true,
              color: true,
            },
          },
        },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        skip,
        take: limit,
      }),
      prisma.transaction.count({ where }),
    ]);

    return {
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getTransactionById(userId: string, id: string): Promise<any> {
    const transaction = await prisma.transaction.findFirst({
      where: { id, userId },
      include: {
        account: {
          select: {
            name: true,
            accountType: true,
            providerType: true,
            providerName: true,
            color: true,
          },
        },
      },
    });

    if (!transaction) {
      throw new Error("Transaction not found or access denied");
    }

    return transaction;
  }

  async createTransaction(
    userId: string,
    data: CreateTransactionInput
  ): Promise<any> {
    // 1. Verify account exists and belongs to user
    const account = await prisma.bankAccount.findFirst({
      where: { id: data.accountId, userId },
    });
    if (!account) {
      throw new Error("Account not found or access denied");
    }

    // 2. Determine transaction type & signed amount
    let type = data.type;
    let amount = data.amount;

    if (!type) {
      type = amount >= 0 ? TransactionType.INCOME : TransactionType.EXPENSE;
    }

    if (type === TransactionType.EXPENSE && amount > 0) {
      amount = -amount;
    } else if (type === TransactionType.INCOME && amount < 0) {
      amount = Math.abs(amount);
    }

    // 3. Save any new labels to user's labels table
    if (data.labels && data.labels.length > 0) {
      for (const labelName of data.labels) {
        const trimmed = labelName.trim();
        if (trimmed) {
          await prisma.label.upsert({
            where: { userId_name: { userId, name: trimmed } },
            update: {},
            create: { userId, name: trimmed, color: "#64748B" },
          });
        }
      }
    }

    const shouldAdjustBalance = data.adjustBalance !== false;

    // 4. Create transaction & adjust balance atomically
    const operations: any[] = [
      prisma.transaction.create({
        data: {
          userId,
          accountId: data.accountId,
          amount,
          type,
          date: data.date ? new Date(data.date) : new Date(),
          description: data.description.trim(),
          category: data.category,
          labels: data.labels || [],
          notes: data.notes || "",
        },
        include: {
          account: {
            select: {
              name: true,
              accountType: true,
              providerType: true,
              providerName: true,
              color: true,
            },
          },
        },
      }),
    ];

    if (shouldAdjustBalance) {
      operations.push(
        prisma.bankAccount.update({
          where: { id: account.id },
          data: { balance: { increment: amount } },
        })
      );
    }

    const [savedTransaction] = await prisma.$transaction(operations);

    return savedTransaction;
  }

  async updateTransaction(
    userId: string,
    id: string,
    data: UpdateTransactionInput
  ): Promise<any> {
    const existingTx = await prisma.transaction.findFirst({
      where: { id, userId },
    });
    if (!existingTx) {
      throw new Error("Transaction not found");
    }

    const oldAccountId = existingTx.accountId;
    const oldAmount = existingTx.amount;

    const targetAccountId = data.accountId || oldAccountId;
    const targetAccount = await prisma.bankAccount.findFirst({
      where: { id: targetAccountId, userId },
    });
    if (!targetAccount) {
      throw new Error("Target account is invalid or access denied");
    }

    let newType = data.type || (existingTx.type as TransactionType);
    let newAmount = data.amount !== undefined ? data.amount : existingTx.amount;

    if (newType === TransactionType.EXPENSE && newAmount > 0) {
      newAmount = -newAmount;
    } else if (newType === TransactionType.INCOME && newAmount < 0) {
      newAmount = Math.abs(newAmount);
    }

    // Save labels if provided
    if (data.labels && data.labels.length > 0) {
      for (const labelName of data.labels) {
        const trimmed = labelName.trim();
        if (trimmed) {
          await prisma.label.upsert({
            where: { userId_name: { userId, name: trimmed } },
            update: {},
            create: { userId, name: trimmed, color: "#64748B" },
          });
        }
      }
    }

    const operations: any[] = [
      prisma.transaction.update({
        where: { id },
        data: {
          accountId: targetAccountId,
          amount: newAmount,
          type: newType,
          ...(data.date && { date: new Date(data.date) }),
          ...(data.description !== undefined && { description: data.description.trim() }),
          ...(data.category !== undefined && { category: data.category }),
          ...(data.labels !== undefined && { labels: data.labels }),
          ...(data.notes !== undefined && { notes: data.notes }),
        },
        include: {
          account: {
            select: {
              name: true,
              accountType: true,
              providerType: true,
              providerName: true,
              color: true,
            },
          },
        },
      }),
    ];

    // Adjust balances
    if (oldAccountId === targetAccountId) {
      const delta = newAmount - oldAmount;
      if (delta !== 0) {
        operations.push(
          prisma.bankAccount.update({
            where: { id: oldAccountId },
            data: { balance: { increment: delta } },
          })
        );
      }
    } else {
      operations.push(
        prisma.bankAccount.update({
          where: { id: oldAccountId },
          data: { balance: { decrement: oldAmount } },
        }),
        prisma.bankAccount.update({
          where: { id: targetAccountId },
          data: { balance: { increment: newAmount } },
        })
      );
    }

    const [updatedTx] = await prisma.$transaction(operations);
    return updatedTx;
  }

  async deleteTransaction(
    userId: string,
    id: string,
    adjustBalance: boolean = true
  ): Promise<{ success: boolean; message: string }> {
    const transaction = await prisma.transaction.findFirst({
      where: { id, userId },
    });
    if (!transaction) {
      throw new Error("Transaction not found");
    }

    const ops: any[] = [
      prisma.transaction.delete({
        where: { id },
      }),
    ];

    if (adjustBalance !== false) {
      ops.unshift(
        prisma.bankAccount.update({
          where: { id: transaction.accountId },
          data: { balance: { decrement: transaction.amount } },
        })
      );
    }

    await prisma.$transaction(ops);

    return {
      success: true,
      message: "Transaction deleted successfully",
    };
  }

  async getSummary(userId: string, query: { startDate?: string; endDate?: string; accountId?: string }) {
    const where: any = { userId };

    if (query.accountId) {
      where.accountId = query.accountId;
    }

    if (query.startDate || query.endDate) {
      where.date = {};
      if (query.startDate) {
        where.date.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        const end = new Date(query.endDate);
        if (query.endDate.length <= 10) {
          end.setHours(23, 59, 59, 999);
        }
        where.date.lte = end;
      }
    }

    const txs = await prisma.transaction.findMany({
      where,
      select: { amount: true, category: true, type: true },
    });

    let totalIncome = 0;
    let totalExpense = 0;
    let netSavings = 0;
    const categoryMap = new Map<string, { category: string; type: string; totalAmount: number; count: number }>();

    for (const tx of txs) {
      if (tx.amount > 0) {
        totalIncome += tx.amount;
      } else if (tx.amount < 0) {
        totalExpense += Math.abs(tx.amount);
      }
      netSavings += tx.amount;

      const catKey = `${tx.category}_${tx.type}`;
      const existing = categoryMap.get(catKey);
      const absAmount = Math.abs(tx.amount);
      if (existing) {
        existing.totalAmount += absAmount;
        existing.count += 1;
      } else {
        categoryMap.set(catKey, {
          category: tx.category,
          type: tx.type,
          totalAmount: absAmount,
          count: 1,
        });
      }
    }

    const categoryBreakdown = Array.from(categoryMap.values()).sort(
      (a, b) => b.totalAmount - a.totalAmount
    );

    return {
      summary: {
        totalIncome,
        totalExpense,
        netSavings,
        transactionCount: txs.length,
      },
      categoryBreakdown,
    };
  }
}
