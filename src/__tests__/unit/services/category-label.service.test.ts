import { describe, it, expect, afterEach } from "bun:test";
import { CategoryLabelService } from "../../../modules/category-label/category-label.service";
import { prisma } from "../../../db";
import { CategoryType } from "../../../constants/category.constant";

describe("CategoryLabelService", () => {
  const service = new CategoryLabelService();

  const originalCategoryFindMany = prisma.category.findMany;
  const originalCategoryFindUnique = prisma.category.findUnique;
  const originalCategoryFindFirst = prisma.category.findFirst;
  const originalCategoryCreate = prisma.category.create;
  const originalCategoryDelete = prisma.category.delete;

  const originalLabelFindMany = prisma.label.findMany;
  const originalLabelFindFirst = prisma.label.findFirst;
  const originalLabelCreate = prisma.label.create;
  const originalLabelDelete = prisma.label.delete;

  afterEach(() => {
    (prisma.category as any).findMany = originalCategoryFindMany;
    (prisma.category as any).findUnique = originalCategoryFindUnique;
    (prisma.category as any).findFirst = originalCategoryFindFirst;
    (prisma.category as any).create = originalCategoryCreate;
    (prisma.category as any).delete = originalCategoryDelete;

    (prisma.label as any).findMany = originalLabelFindMany;
    (prisma.label as any).findFirst = originalLabelFindFirst;
    (prisma.label as any).create = originalLabelCreate;
    (prisma.label as any).delete = originalLabelDelete;
  });

  describe("getCategories", () => {
    it("should return presets and custom categories for authenticated user", async () => {
      (prisma.category as any).findMany = async () => [
        {
          id: "custom-cat-1",
          slug: "custom_hobby",
          name: "Custom Hobby",
          type: "EXPENSE",
          icon: "Gamepad",
          color: "#8B5CF6",
        },
      ];

      const result = await service.getCategories("user-1");
      expect(result.presets.length).toBeGreaterThan(0);
      expect(result.custom.length).toBe(1);
      expect(result.all.length).toBe(result.presets.length + 1);
    });

    it("should return presets only if userId is not provided", async () => {
      const result = await service.getCategories();
      expect(result.presets.length).toBeGreaterThan(0);
      expect(result.custom.length).toBe(0);
      expect(result.all.length).toBe(result.presets.length);
    });
  });

  describe("createCategory", () => {
    it("should create a custom category successfully", async () => {
      (prisma.category as any).findUnique = async () => null;
      (prisma.category as any).create = async (args: any) => ({
        id: "cat-new-1",
        ...args.data,
      });

      const category = await service.createCategory("user-1", {
        name: "My Special Hobby",
        type: CategoryType.EXPENSE,
        icon: "Camera",
        color: "#EF4444",
      });

      expect(category.name).toBe("My Special Hobby");
      expect(category.slug).toBe("my_special_hobby");
      expect(category.isCustom).toBe(true);
    });

    it("should throw error if category name matches a system preset", async () => {
      let err: any;
      try {
        await service.createCategory("user-1", {
          name: "Food & Beverage",
          type: CategoryType.EXPENSE,
        });
      } catch (e) {
        err = e;
      }

      expect(err).toBeDefined();
      expect(err.message).toContain("already exists in system defaults");
    });

    it("should throw error if custom category already exists for user", async () => {
      (prisma.category as any).findUnique = async () => ({
        id: "existing-cat",
        name: "Freelance Client",
        slug: "freelance_client",
      });

      let err: any;
      try {
        await service.createCategory("user-1", {
          name: "Freelance Client",
          type: CategoryType.INCOME,
        });
      } catch (e) {
        err = e;
      }

      expect(err).toBeDefined();
      expect(err.message).toContain("already exists");
    });
  });

  describe("deleteCategory", () => {
    it("should delete custom category", async () => {
      (prisma.category as any).findFirst = async () => ({
        id: "cat-1",
        userId: "user-1",
      });
      (prisma.category as any).delete = async () => ({ id: "cat-1" });

      const result = await service.deleteCategory("user-1", "cat-1");
      expect(result.success).toBe(true);
      expect(result.message).toContain("Category deleted successfully");
    });

    it("should throw error if category not found or belongs to another user", async () => {
      (prisma.category as any).findFirst = async () => null;

      let err: any;
      try {
        await service.deleteCategory("user-1", "non-existent");
      } catch (e) {
        err = e;
      }

      expect(err).toBeDefined();
      expect(err.message).toContain("Custom category not found or access denied");
    });
  });

  describe("getLabels", () => {
    it("should return user labels", async () => {
      (prisma.label as any).findMany = async () => [
        { id: "lbl-1", userId: "user-1", name: "Family", color: "#64748B" },
      ];

      const labels = await service.getLabels("user-1");
      expect(labels.length).toBe(1);
      expect(labels[0].name).toBe("Family");
    });
  });

  describe("createLabel", () => {
    it("should return existing label if matching name already exists (case-insensitive)", async () => {
      const existingLabel = { id: "lbl-1", userId: "user-1", name: "Family", color: "#64748B" };
      (prisma.label as any).findFirst = async () => existingLabel;

      const result = await service.createLabel("user-1", { name: "family" });
      expect(result).toEqual(existingLabel as any);
    });

    it("should create label if not found", async () => {
      (prisma.label as any).findFirst = async () => null;
      (prisma.label as any).create = async (args: any) => ({
        id: "lbl-new",
        ...args.data,
      });

      const result = await service.createLabel("user-1", { name: "Work", color: "#3B82F6" });
      expect(result.name).toBe("Work");
      expect(result.color).toBe("#3B82F6");
    });
  });

  describe("deleteLabel", () => {
    it("should delete label successfully", async () => {
      (prisma.label as any).findFirst = async () => ({ id: "lbl-1", userId: "user-1" });
      (prisma.label as any).delete = async () => ({ id: "lbl-1" });

      const result = await service.deleteLabel("user-1", "lbl-1");
      expect(result.success).toBe(true);
    });

    it("should throw error if label not found", async () => {
      (prisma.label as any).findFirst = async () => null;

      let err: any;
      try {
        await service.deleteLabel("user-1", "non-existent");
      } catch (e) {
        err = e;
      }

      expect(err).toBeDefined();
      expect(err.message).toContain("Label not found or access denied");
    });
  });
});
