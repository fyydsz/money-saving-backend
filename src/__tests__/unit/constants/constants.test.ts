import { describe, it, expect } from "bun:test";
import {
  AccountType,
  ProviderType,
  POPULAR_BANKS,
  POPULAR_EWALLETS,
} from "../../../constants/account.constant";
import {
  CategoryType,
  DEFAULT_CATEGORIES,
} from "../../../constants/category.constant";

describe("Account Constants", () => {
  it("should define valid AccountType enum values", () => {
    expect(AccountType.SAVINGS).toBe("SAVINGS");
    expect(AccountType.CREDIT_CARD).toBe("CREDIT_CARD");
    expect(AccountType.TIME_DEPOSIT).toBe("TIME_DEPOSIT");
    expect(AccountType.INVESTMENT).toBe("INVESTMENT");
    expect(AccountType.LOAN).toBe("LOAN");
    expect(AccountType.PAYLATER).toBe("PAYLATER");
    expect(AccountType.CASH).toBe("CASH");
    expect(AccountType.OTHER).toBe("OTHER");
  });

  it("should define valid ProviderType enum values", () => {
    expect(ProviderType.BANK).toBe("BANK");
    expect(ProviderType.E_WALLET).toBe("E_WALLET");
    expect(ProviderType.CASH).toBe("CASH");
    expect(ProviderType.OTHER).toBe("OTHER");
  });

  it("should list popular banks and e-wallets", () => {
    expect(POPULAR_BANKS.length).toBeGreaterThan(5);
    expect(POPULAR_BANKS).toContain("BCA");
    expect(POPULAR_BANKS).toContain("Mandiri");

    expect(POPULAR_EWALLETS.length).toBeGreaterThan(3);
    expect(POPULAR_EWALLETS).toContain("GoPay");
    expect(POPULAR_EWALLETS).toContain("OVO");
  });
});

describe("Category Constants", () => {
  it("should define valid CategoryType enum values", () => {
    expect(CategoryType.EXPENSE).toBe("EXPENSE");
    expect(CategoryType.INCOME).toBe("INCOME");
  });

  it("should have comprehensive DEFAULT_CATEGORIES with unique ids and valid properties", () => {
    expect(DEFAULT_CATEGORIES.length).toBeGreaterThan(5);

    const ids = new Set<string>();
    for (const cat of DEFAULT_CATEGORIES) {
      expect(cat.id).toBeDefined();
      expect(cat.name).toBeDefined();
      expect([CategoryType.EXPENSE, CategoryType.INCOME]).toContain(cat.type);
      expect(cat.icon).toBeDefined();
      expect(cat.color).toMatch(/^#[0-9A-Fa-f]{6}$/);

      expect(ids.has(cat.id)).toBe(false);
      ids.add(cat.id);
    }
  });

  it("should include standard expense and income categories", () => {
    const expenseCategories = DEFAULT_CATEGORIES.filter((c) => c.type === CategoryType.EXPENSE);
    const incomeCategories = DEFAULT_CATEGORIES.filter((c) => c.type === CategoryType.INCOME);

    expect(expenseCategories.some((c) => c.id === "food_beverage")).toBe(true);
    expect(expenseCategories.some((c) => c.id === "transportation")).toBe(true);
    expect(incomeCategories.some((c) => c.id === "salary_income")).toBe(true);
  });
});
