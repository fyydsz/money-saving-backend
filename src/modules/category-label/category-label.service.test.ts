import { expect, describe, it } from "bun:test";
import { CategoryLabelService } from "./category-label.service";
import { CategoryType, DEFAULT_CATEGORIES } from "../../constants/category.constant";
import { Category, Label } from "../../db";

describe("CategoryLabelService Unit Tests", () => {
  const testUserId = "user_mock_cat_label_test";
  const service = new CategoryLabelService();

  it("should return presets and custom categories merged", async () => {
    const mockCustomCategories = [
      {
        _id: "custom1",
        slug: "crypto_investment",
        name: "Crypto Investment",
        type: CategoryType.INCOME,
        icon: "Bitcoin",
        color: "#F59E0B",
        description: "Trading profit",
      },
    ];

    const originalFind = Category.find;
    try {
      Category.find = (() => ({
        sort: async () => mockCustomCategories,
      })) as any;

      const result = await service.getCategories(testUserId);
      expect(result.presets.length).toBe(DEFAULT_CATEGORIES.length);
      expect(result.custom.length).toBe(1);
      expect(result.all.length).toBe(DEFAULT_CATEGORIES.length + 1);
    } finally {
      Category.find = originalFind;
    }
  });

  it("should create custom category with valid slug", async () => {
    const originalFindOne = Category.findOne;
    const originalSave = Category.prototype.save;

    try {
      Category.findOne = (async () => null) as any;
      Category.prototype.save = async function () {
        return this;
      };

      const category = await service.createCategory(testUserId, {
        name: "Motorcycle Service",
        type: CategoryType.EXPENSE,
        icon: "Wrench",
        color: "#EF4444",
      });

      expect(category.name).toBe("Motorcycle Service");
      expect(category.slug).toBe("motorcycle_service");
      expect(category.type).toBe(CategoryType.EXPENSE);
      expect(category.isDefault).toBe(false);
    } finally {
      Category.findOne = originalFindOne;
      Category.prototype.save = originalSave;
    }
  });

  it("should reject custom category if slug or name conflicts with default presets", async () => {
    expect(
      service.createCategory(testUserId, {
        name: "Food & Beverage", // Conflicts with preset name
        type: CategoryType.EXPENSE,
      })
    ).rejects.toThrow("already exists in system defaults");

    expect(
      service.createCategory(testUserId, {
        name: "food_beverage", // Conflicts with preset id
        type: CategoryType.EXPENSE,
      })
    ).rejects.toThrow("already exists in system defaults");
  });

  it("should create a new label or reuse existing label", async () => {
    const originalFindOne = Label.findOne;
    const originalSave = Label.prototype.save;

    try {
      // 1. Create new label when not exists
      Label.findOne = (async () => null) as any;
      Label.prototype.save = async function () {
        return this;
      };

      const newLabel = await service.createLabel(testUserId, {
        name: "Emergency Fund",
        color: "#10B981",
      });

      expect(newLabel.name).toBe("Emergency Fund");
      expect(newLabel.color).toBe("#10B981");

      // 2. Reuse existing label if found
      const existingLabelMock: any = {
        _id: "lbl_existing",
        name: "Emergency Fund",
        color: "#10B981",
      };
      Label.findOne = (async () => existingLabelMock) as any;

      const reused = await service.createLabel(testUserId, {
        name: "Emergency Fund",
      });
      expect(reused._id).toBe("lbl_existing");
    } finally {
      Label.findOne = originalFindOne;
      Label.prototype.save = originalSave;
    }
  });

  it("should delete label successfully", async () => {
    let deleted = false;
    const mockLabel: any = {
      _id: "lbl_delete",
      userId: testUserId,
      deleteOne: async () => {
        deleted = true;
      },
    };

    const originalFindOne = Label.findOne;
    try {
      Label.findOne = (async () => mockLabel) as any;

      const result = await service.deleteLabel(testUserId, "lbl_delete");
      expect(result.success).toBe(true);
      expect(deleted).toBe(true);
    } finally {
      Label.findOne = originalFindOne;
    }
  });
});
