import { Schema, model, models, Document, Types } from "mongoose";

export type GoalCategory =
  | "couple"
  | "travel"
  | "emergency"
  | "gadget"
  | "investment"
  | "education"
  | "general";

export const GOAL_CATEGORIES: GoalCategory[] = [
  "couple",
  "travel",
  "emergency",
  "gadget",
  "investment",
  "education",
  "general",
];

export interface IGoal extends Document {
  title: string;
  description?: string;
  targetAmount: number;
  currentAmount: number;
  category: GoalCategory;
  icon?: string;
  deadline?: Date;
  creator: Types.ObjectId;
  isShared: boolean;
  status: "active" | "completed" | "cancelled";
  createdAt: Date;
  updatedAt: Date;
}

const goalSchema = new Schema<IGoal>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    targetAmount: {
      type: Number,
      required: true,
      min: 1,
    },
    currentAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    category: {
      type: String,
      enum: GOAL_CATEGORIES,
      default: "general",
      index: true,
    },
    icon: {
      type: String,
      default: "🎯",
    },
    deadline: {
      type: Date,
    },
    creator: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    isShared: {
      type: Boolean,
      default: false,
      index: true,
    },
    status: {
      type: String,
      enum: ["active", "completed", "cancelled"],
      default: "active",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Goal = models.Goal || model<IGoal>("Goal", goalSchema);
