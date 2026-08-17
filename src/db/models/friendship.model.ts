import { Schema, model, models, Document, Types } from "mongoose";

export type RelationshipType =
  | "girlfriend"
  | "boyfriend"
  | "partner"
  | "spouse"
  | "bestfriend"
  | "family"
  | "friend";

export const RELATIONSHIP_TYPES: RelationshipType[] = [
  "girlfriend",
  "boyfriend",
  "partner",
  "spouse",
  "bestfriend",
  "family",
  "friend",
];

export interface IUserCustomization {
  relationshipType: RelationshipType;
  nickname?: string;
}

export interface IFriendship extends Document {
  requester: Types.ObjectId;
  recipient: Types.ObjectId;
  status: "pending" | "accepted" | "declined" | "blocked";
  requesterCustom: IUserCustomization;
  recipientCustom: IUserCustomization;
  createdAt: Date;
  updatedAt: Date;
}

const userCustomizationSchema = new Schema<IUserCustomization>(
  {
    relationshipType: {
      type: String,
      enum: RELATIONSHIP_TYPES,
      default: "friend",
    },
    nickname: {
      type: String,
      trim: true,
      maxlength: 50,
    },
  },
  { _id: false }
);

const friendshipSchema = new Schema<IFriendship>(
  {
    requester: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    recipient: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined", "blocked"],
      default: "pending",
      index: true,
    },
    requesterCustom: {
      type: userCustomizationSchema,
      default: () => ({ relationshipType: "friend" }),
    },
    recipientCustom: {
      type: userCustomizationSchema,
      default: () => ({ relationshipType: "friend" }),
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index to prevent duplicate friend requests between the same pair
friendshipSchema.index({ requester: 1, recipient: 1 }, { unique: true });

export const Friendship =
  models.Friendship || model<IFriendship>("Friendship", friendshipSchema);
