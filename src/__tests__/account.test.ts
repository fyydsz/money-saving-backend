import { describe, it, expect } from "bun:test";
import { AccountService } from "../modules/account/account.service";
import { AccountType, ProviderType } from "../constants/account.constant";

describe("Account Validation - Non-Negative Balance", () => {
  const accountService = new AccountService();

  it("should throw an error when creating an account with negative balance", async () => {
    let error: any = null;
    try {
      await accountService.createAccount("test-user-id", {
        name: "Test Account",
        accountType: AccountType.SAVINGS,
        providerType: ProviderType.BANK,
        providerName: "BCA",
        balance: -50000,
      });
    } catch (err: any) {
      error = err;
    }

    expect(error).not.toBeNull();
    expect(error.message).toContain("tidak boleh bernilai negatif");
  });

  it("should throw an error when updating a non-existent account", async () => {
    let error: any = null;
    try {
      await accountService.updateAccount("test-user-id", "non-existent-id", {
        name: "Updated Name",
      });
    } catch (err: any) {
      error = err;
    }

    expect(error).not.toBeNull();
  });
});
