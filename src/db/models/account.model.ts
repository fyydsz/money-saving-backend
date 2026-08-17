import { Schema, model, models, Document } from "mongoose";
import { AccountType, ProviderType } from "../../constants/account.constant";

export interface IAccount extends Document {
  userId: string;
  name: string;
  accountType: AccountType;
  providerType: ProviderType;
  providerName: string;
  balance: number;
  currency: string;
  color?: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const accountSchema = new Schema<IAccount>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    accountType: {
      type: String,
      enum: Object.values(AccountType),
      required: true,
      default: AccountType.SAVINGS,
    },
    providerType: {
      type: String,
      enum: Object.values(ProviderType),
      required: true,
      default: ProviderType.BANK,
    },
    providerName: {
      type: String,
      required: true,
      trim: true,
    },
    balance: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      default: "IDR",
      uppercase: true,
    },
    color: {
      type: String,
      default: "#3B82F6",
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

accountSchema.index({ userId: 1, name: 1 });

export const Account = models.Account || model<IAccount>("Account", accountSchema);

