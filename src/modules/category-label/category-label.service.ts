import { Category, ICategory, Label, ILabel } from "../../db";
import { DEFAULT_CATEGORIES, CategoryType } from "../../constants/category.constant";
import { CreateCategoryInput, CreateLabelInput } from "./category-label.dto";

export class CategoryLabelService {
  async getCategories(userId?: string) {
    const customCategories = userId
      ? await Category.find({ userId }).sort({ name: 1 })
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
          id: c._id.toString(),
          slug: c.slug,
          name: c.name,
          type: c.type,
          icon: c.icon,
          color: c.color,
          description: c.description,
          isDefault: false,
        })),
      ],
    };
  }

  async createCategory(userId: string, data: CreateCategoryInput): Promise<ICategory> {
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

    const existing = await Category.findOne({ userId, slug });
    if (existing) {
      throw new Error(`Category '${data.name}' already exists`);
    }

    const category = new Category({
      userId,
      slug,
      name: data.name,
      type: data.type,
      icon: data.icon || "Tag",
      color: data.color || "#64748B",
      description: data.description || "",
      isDefault: false,
    });

    return await category.save();
  }

  async deleteCategory(userId: string, categoryId: string): Promise<{ success: boolean; message: string }> {
    const category = await Category.findOne({ _id: categoryId, userId });
    if (!category) {
      throw new Error("Custom category not found or access denied");
    }

    await category.deleteOne();
    return {
      success: true,
      message: "Category deleted successfully",
    };
  }

  async getLabels(userId: string): Promise<ILabel[]> {
    return await Label.find({ userId }).sort({ name: 1 });
  }

  async createLabel(userId: string, data: CreateLabelInput): Promise<ILabel> {
    const trimmedName = data.name.trim();

    const existing = await Label.findOne({
      userId,
      name: { $regex: new RegExp(`^${trimmedName}$`, "i") },
    });

    if (existing) {
      return existing;
    }

    const label = new Label({
      userId,
      name: trimmedName,
      color: data.color || "#64748B",
    });

    return await label.save();
  }

  async deleteLabel(userId: string, labelId: string): Promise<{ success: boolean; message: string }> {
    const label = await Label.findOne({ _id: labelId, userId });
    if (!label) {
      throw new Error("Label not found or access denied");
    }

    await label.deleteOne();
    return {
      success: true,
      message: "Label deleted successfully",
    };
  }
}
