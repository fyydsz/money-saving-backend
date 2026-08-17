import { Schema, model, models, Document } from "mongoose";

export interface ILabel extends Document {
  userId: string;
  name: string;
  color?: string;
  createdAt: Date;
  updatedAt: Date;
}

const labelSchema = new Schema<ILabel>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    color: {
      type: String,
      default: "#64748B",
    },
  },
  {
    timestamps: true,
  }
);

labelSchema.index({ userId: 1, name: 1 }, { unique: true });

export const Label = models.Label || model<ILabel>("Label", labelSchema);

