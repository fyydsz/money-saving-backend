import { prisma } from "../../db";
import { DEFAULT_CATEGORIES, CategoryType } from "../../constants/category.constant";
import { CreateCategoryInput, CreateLabelInput } from "./category-label.dto";
import type { Category, Label } from "@prisma/client";

export class CategoryLabelService {
  async getCategories(userId?: string) {
    const customCategories = userId
      ? await prisma.category.findMany({
          where: { userId },
          orderBy: { name: "asc" },
        })
      : [];

    return {
      presets: DEFAULT_CATEGORIES,
      custom: customCategories,
      all: [
        ...DEFAULT_CATEGORIES.map((c) => ({
          ...c,
          slug: c.id,
          isDefault: true,
        })),
        ...customCategories.map((c) => ({
          id: c.id,
          slug: c.slug,
          name: c.name,
          type: c.type,
          icon: c.icon,
          color: c.color,
          description: "",
          isDefault: false,
        })),
      ],
    };
  }

  async createCategory(userId: string, data: CreateCategoryInput): Promise<Category> {
    const slug = data.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

    // Check if slug or name exists in presets
    const presetExists = DEFAULT_CATEGORIES.some(
      (c) => c.id === slug || c.name.toLowerCase() === data.name.toLowerCase().trim()
    );
    if (presetExists) {
      throw new Error(`Category '${data.name}' already exists in system defaults`);
    }

    const existing = await prisma.category.findUnique({
      where: {
        userId_slug: { userId, slug },
      },
    });
    if (existing) {
      throw new Error(`Category '${data.name}' already exists`);
    }

    return await prisma.category.create({
      data: {
        userId,
        slug,
        name: data.name,
        type: data.type,
        icon: data.icon || "Tag",
        color: data.color || "#64748B",
        isCustom: true,
        isArchived: false,
      },
    });
  }

  async deleteCategory(userId: string, categoryId: string): Promise<{ success: boolean; message: string }> {
    const category = await prisma.category.findFirst({
      where: { id: categoryId, userId },
    });
    if (!category) {
      throw new Error("Custom category not found or access denied");
    }

    await prisma.category.delete({
      where: { id: categoryId },
    });
    return {
      success: true,
      message: "Category deleted successfully",
    };
  }

  async getLabels(userId: string): Promise<Label[]> {
    return await prisma.label.findMany({
      where: { userId },
      orderBy: { name: "asc" },
    });
  }

  async createLabel(userId: string, data: CreateLabelInput): Promise<Label> {
    const trimmedName = data.name.trim();

    const existing = await prisma.label.findFirst({
      where: {
        userId,
        name: { equals: trimmedName, mode: "insensitive" },
      },
    });

    if (existing) {
      return existing;
    }

    return await prisma.label.create({
      data: {
        userId,
        name: trimmedName,
        color: data.color || "#64748B",
      },
    });
  }

  async deleteLabel(userId: string, labelId: string): Promise<{ success: boolean; message: string }> {
    const label = await prisma.label.findFirst({
      where: { id: labelId, userId },
    });
    if (!label) {
      throw new Error("Label not found or access denied");
    }

    await prisma.label.delete({
      where: { id: labelId },
    });
    return {
      success: true,
      message: "Label deleted successfully",
    };
  }
}
