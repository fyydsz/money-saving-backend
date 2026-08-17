import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    console.log("🔗 Connecting to MongoDB...");
    const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/elysia-auth";
    await mongoose.connect(mongoUri, {
      dbName: "money-saving",
    });
    console.log("🍃 MongoDB connected successfully");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
};

export * from "./models";
