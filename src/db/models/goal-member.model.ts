import { Schema, model, models, Document, Types } from "mongoose";

export interface IGoalMember extends Document {
  goalId: Types.ObjectId;
  userId: Types.ObjectId;
  role: "creator" | "member";
  status: "invited" | "accepted" | "declined";
  targetContribution?: number;
  totalContributed: number;
  createdAt: Date;
  updatedAt: Date;
}

const goalMemberSchema = new Schema<IGoalMember>(
  {
    goalId: {
      type: Schema.Types.ObjectId,
      ref: "Goal",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["creator", "member"],
      default: "member",
    },
    status: {
      type: String,
      enum: ["invited", "accepted", "declined"],
      default: "invited",
      index: true,
    },
    targetContribution: {
      type: Number,
      min: 0,
    },
    totalContributed: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index so user is registered only once per goal
goalMemberSchema.index({ goalId: 1, userId: 1 }, { unique: true });

export const GoalMember =
  models.GoalMember || model<IGoalMember>("GoalMember", goalMemberSchema);
