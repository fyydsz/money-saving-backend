import { Schema, model, models, Document } from "mongoose";
import { CategoryType } from "../../constants/category.constant";

export interface ICategory extends Document {
  userId?: string | null;
  slug: string;
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
  description?: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<ICategory>(
  {
    userId: {
      type: String,
      default: null,
      index: true,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: Object.values(CategoryType),
      required: true,
      default: CategoryType.EXPENSE,
    },
    icon: {
      type: String,
      default: "Tag",
    },
    color: {
      type: String,
      default: "#64748B",
    },
    description: {
      type: String,
      default: "",
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

categorySchema.index({ userId: 1, slug: 1 });

export const Category = models.Category || model<ICategory>("Category", categorySchema);

