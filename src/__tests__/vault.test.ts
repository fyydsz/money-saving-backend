import { describe, it, expect } from "bun:test";
import { VaultService } from "../modules/vault/vault.service";
import { AccountType, ProviderType } from "../constants/account.constant";

describe("Vault Validation - Non-Negative Balance", () => {
  const vaultService = new VaultService();

  it("should throw an error when creating an account with negative balance", async () => {
    let error: any = null;
    try {
      await vaultService.createVault("test-user-id", {
        name: "Test Vault",
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
      await vaultService.updateVault("test-user-id", "non-existent-id", {
        name: "Updated Name",
      });
    } catch (err: any) {
      error = err;
    }

    expect(error).not.toBeNull();
  });
});

