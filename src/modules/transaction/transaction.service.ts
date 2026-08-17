import { Types } from "mongoose";
import { Transaction, ITransaction, TransactionType, Account, Label } from "../../db";
import {
  CreateTransactionInput,
  UpdateTransactionInput,
  TransactionQueryInput,
} from "./transaction.dto";

export class TransactionService {
  async getTransactions(userId: string, query: TransactionQueryInput) {
    const filter: any = { userId };

    if (query.accountId) {
      filter.accountId = new Types.ObjectId(query.accountId);
    }

    if (query.category) {
      filter.category = query.category;
    }

    if (query.label) {
      filter.labels = query.label;
    }

    if (query.type) {
      filter.type = query.type;
    }

    if (query.search) {
      filter.$or = [
        { description: { $regex: query.search, $options: "i" } },
        { notes: { $regex: query.search, $options: "i" } },
      ];
    }

    if (query.startDate || query.endDate) {
      filter.date = {};
      if (query.startDate) {
        filter.date.$gte = new Date(query.startDate);
      }
      if (query.endDate) {
        const end = new Date(query.endDate);
        // Include full end day if only date is passed
        if (query.endDate.length <= 10) {
          end.setHours(23, 59, 59, 999);
        }
        filter.date.$lte = end;
      }
    }

    const page = Math.max(1, parseInt(query.page || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || "20", 10)));
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .populate("accountId", "name accountType providerType providerName color")
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Transaction.countDocuments(filter),
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

  async getTransactionById(userId: string, id: string): Promise<ITransaction> {
    const transaction = await Transaction.findOne({ _id: id, userId }).populate(
      "accountId",
      "name accountType providerType providerName color"
    );

    if (!transaction) {
      throw new Error("Transaction not found or access denied");
    }

    return transaction;
  }

  async createTransaction(
    userId: string,
    data: CreateTransactionInput
  ): Promise<ITransaction> {
    // 1. Verify account exists and belongs to user
    const account = await Account.findOne({ _id: data.accountId, userId });
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

    // 3. Save any new labels to user's labels collection
    if (data.labels && data.labels.length > 0) {
      for (const labelName of data.labels) {
        const trimmed = labelName.trim();
        if (trimmed) {
          await Label.findOneAndUpdate(
            { userId, name: trimmed },
            { $setOnInsert: { userId, name: trimmed, color: "#64748B" } },
            { upsert: true }
          );
        }
      }
    }

    // 4. Create transaction
    const transaction = new Transaction({
      userId,
      accountId: new Types.ObjectId(data.accountId),
      amount,
      type,
      date: data.date ? new Date(data.date) : new Date(),
      description: data.description.trim(),
      category: data.category,
      labels: data.labels || [],
      notes: data.notes || "",
    });

    const savedTransaction = await transaction.save();

    // 5. Update Account Balance atomically
    await Account.findByIdAndUpdate(account._id, {
      $inc: { balance: amount },
    });

    return await savedTransaction.populate(
      "accountId",
      "name accountType providerType providerName color"
    );
  }

  async updateTransaction(
    userId: string,
    id: string,
    data: UpdateTransactionInput
  ): Promise<ITransaction> {
    const existingTx = await Transaction.findOne({ _id: id, userId });
    if (!existingTx) {
      throw new Error("Transaction not found");
    }

    const oldAccountId = existingTx.accountId.toString();
    const oldAmount = existingTx.amount;

    const targetAccountId = data.accountId || oldAccountId;
    const targetAccount = await Account.findOne({ _id: targetAccountId, userId });
    if (!targetAccount) {
      throw new Error("Target account is invalid or access denied");
    }

    let newType = data.type || existingTx.type;
    let newAmount = data.amount !== undefined ? data.amount : existingTx.amount;

    if (newType === TransactionType.EXPENSE && newAmount > 0) {
      newAmount = -newAmount;
    } else if (newType === TransactionType.INCOME && newAmount < 0) {
      newAmount = Math.abs(newAmount);
    }

    // Update fields
    existingTx.accountId = new Types.ObjectId(targetAccountId);
    existingTx.amount = newAmount;
    existingTx.type = newType;
    if (data.date) existingTx.date = new Date(data.date);
    if (data.description !== undefined) existingTx.description = data.description.trim();
    if (data.category !== undefined) existingTx.category = data.category;
    if (data.labels !== undefined) existingTx.labels = data.labels;
    if (data.notes !== undefined) existingTx.notes = data.notes;

    // Save labels if provided
    if (data.labels && data.labels.length > 0) {
      for (const labelName of data.labels) {
        const trimmed = labelName.trim();
        if (trimmed) {
          await Label.findOneAndUpdate(
            { userId, name: trimmed },
            { $setOnInsert: { userId, name: trimmed, color: "#64748B" } },
            { upsert: true }
          );
        }
      }
    }

    const saved = await existingTx.save();

    // Adjust balances
    if (oldAccountId === targetAccountId) {
      // Same account: apply delta
      const delta = newAmount - oldAmount;
      if (delta !== 0) {
        await Account.findByIdAndUpdate(oldAccountId, { $inc: { balance: delta } });
      }
    } else {
      // Different accounts: revert old, apply new
      await Account.findByIdAndUpdate(oldAccountId, { $inc: { balance: -oldAmount } });
      await Account.findByIdAndUpdate(targetAccountId, { $inc: { balance: newAmount } });
    }

    return await saved.populate(
      "accountId",
      "name accountType providerType providerName color"
    );
  }

  async deleteTransaction(
    userId: string,
    id: string
  ): Promise<{ success: boolean; message: string }> {
    const transaction = await Transaction.findOne({ _id: id, userId });
    if (!transaction) {
      throw new Error("Transaction not found");
    }

    // Revert balance on Account
    await Account.findByIdAndUpdate(transaction.accountId, {
      $inc: { balance: -transaction.amount },
    });

    await transaction.deleteOne();

    return {
      success: true,
      message: "Transaction deleted successfully and account balance adjusted",
    };
  }

  async getSummary(userId: string, query: { startDate?: string; endDate?: string; accountId?: string }) {
    const filter: any = { userId };

    if (query.accountId) {
      filter.accountId = new Types.ObjectId(query.accountId);
    }

    if (query.startDate || query.endDate) {
      filter.date = {};
      if (query.startDate) {
        filter.date.$gte = new Date(query.startDate);
      }
      if (query.endDate) {
        const end = new Date(query.endDate);
        if (query.endDate.length <= 10) {
          end.setHours(23, 59, 59, 999);
        }
        filter.date.$lte = end;
      }
    }

    const [summaryResult, categoryBreakdown] = await Promise.all([
      Transaction.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalIncome: {
              $sum: {
                $cond: [{ $gt: ["$amount", 0] }, "$amount", 0],
              },
            },
            totalExpense: {
              $sum: {
                $cond: [{ $lt: ["$amount", 0] }, { $abs: "$amount" }, 0],
              },
            },
            netSavings: { $sum: "$amount" },
            transactionCount: { $sum: 1 },
          },
        },
      ]),
      Transaction.aggregate([
        { $match: filter },
        {
          $group: {
            _id: { category: "$category", type: "$type" },
            totalAmount: { $sum: { $abs: "$amount" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { totalAmount: -1 } },
      ]),
    ]);

    const stats = summaryResult[0] || {
      totalIncome: 0,
      totalExpense: 0,
      netSavings: 0,
      transactionCount: 0,
    };

    return {
      summary: stats,
      categoryBreakdown: categoryBreakdown.map((item) => ({
        category: item._id.category,
        type: item._id.type,
        totalAmount: item.totalAmount,
        count: item.count,
      })),
    };
  }
}
