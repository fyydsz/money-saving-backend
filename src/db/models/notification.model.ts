import { Schema, model, models, Document, Types } from "mongoose";

export type NotificationType =
  | "FRIEND_REQUEST"
  | "FRIEND_ACCEPTED"
  | "GOAL_INVITATION"
  | "GOAL_ACCEPTED"
  | "GOAL_CONTRIBUTION";

export const NOTIFICATION_TYPES: NotificationType[] = [
  "FRIEND_REQUEST",
  "FRIEND_ACCEPTED",
  "GOAL_INVITATION",
  "GOAL_ACCEPTED",
  "GOAL_CONTRIBUTION",
];

export interface INotification extends Document {
  recipient: Types.ObjectId;
  sender: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  data?: {
    friendshipId?: Types.ObjectId;
    goalId?: Types.ObjectId;
    amount?: number;
    [key: string]: any;
  };
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: NOTIFICATION_TYPES,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    data: {
      type: Schema.Types.Mixed,
      default: {},
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Helpful index for fetching user notifications sorted by latest
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });

export const Notification =
  models.Notification ||
  model<INotification>("Notification", notificationSchema);
