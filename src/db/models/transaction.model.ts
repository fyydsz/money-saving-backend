import { Schema, model, models, Document, Types } from "mongoose";
import { CategoryType } from "../../constants/category.constant";

export enum TransactionType {
  EXPENSE = "EXPENSE",
  INCOME = "INCOME",
  TRANSFER = "TRANSFER",
}

export interface ITransaction extends Document {
  userId: string;
  accountId: Types.ObjectId;
  amount: number; // Signed number: positive (+) for income, negative (-) for expense
  type: TransactionType;
  date: Date;
  description: string;
  category: string; // Category slug e.g. "food_beverage", "education", etc.
  labels: string[]; // User defined label names
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const transactionSchema = new Schema<ITransaction>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    accountId: {
      type: Schema.Types.ObjectId,
      ref: "Account",
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    type: {
      type: String,
      enum: Object.values(TransactionType),
      required: true,
      default: TransactionType.EXPENSE,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      default: "other_expense",
      index: true,
    },
    labels: {
      type: [String],
      default: [],
    },
    notes: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

transactionSchema.index({ userId: 1, date: -1 });
transactionSchema.index({ userId: 1, accountId: 1 });

export const Transaction = models.Transaction || model<ITransaction>("Transaction", transactionSchema);

