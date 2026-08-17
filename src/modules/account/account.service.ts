import { Account, IAccount, Transaction } from "../../db";
import {
  AccountType,
  ProviderType,
  POPULAR_BANKS,
  POPULAR_EWALLETS,
} from "../../constants/account.constant";
import { CreateAccountInput, UpdateAccountInput } from "./account.dto";

export class AccountService {
  async getUserAccounts(userId: string) {
    const accounts = await Account.find({ userId }).sort({ isDefault: -1, createdAt: 1 });
    
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

  async getAccountById(userId: string, accountId: string): Promise<IAccount> {
    const account = await Account.findOne({ _id: accountId, userId });
    if (!account) {
      throw new Error("Account not found or access denied");
    }
    return account;
  }

  async createAccount(userId: string, data: CreateAccountInput): Promise<IAccount> {
    // If set as default, reset other accounts
    if (data.isDefault) {
      await Account.updateMany({ userId }, { isDefault: false });
    } else {
      // If this is the first account, set as default automatically
      const existingCount = await Account.countDocuments({ userId });
      if (existingCount === 0) {
        data.isDefault = true;
      }
    }

    const account = new Account({
      userId,
      name: data.name,
      accountType: data.accountType,
      providerType: data.providerType,
      providerName: data.providerName,
      balance: data.balance ?? 0,
      currency: data.currency ?? "IDR",
      color: data.color ?? "#3B82F6",
      isDefault: data.isDefault ?? false,
    });

    return await account.save();
  }

  async updateAccount(
    userId: string,
    accountId: string,
    data: UpdateAccountInput
  ): Promise<IAccount> {
    const account = await this.getAccountById(userId, accountId);

    if (data.isDefault) {
      await Account.updateMany({ userId, _id: { $ne: accountId } }, { isDefault: false });
    }

    if (data.name !== undefined) account.name = data.name;
    if (data.accountType !== undefined) account.accountType = data.accountType;
    if (data.providerType !== undefined) account.providerType = data.providerType;
    if (data.providerName !== undefined) account.providerName = data.providerName;
    if (data.currency !== undefined) account.currency = data.currency;
    if (data.color !== undefined) account.color = data.color;
    if (data.isDefault !== undefined) account.isDefault = data.isDefault;

    return await account.save();
  }

  async deleteAccount(userId: string, accountId: string): Promise<{ success: boolean; message: string }> {
    const account = await this.getAccountById(userId, accountId);

    // Delete all transactions associated with this account
    await Transaction.deleteMany({ userId, accountId });

    await account.deleteOne();

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
