import mongoose from "mongoose";
import { hashPassword, verifyPassword } from "../../utils/password";

type UserModel = {
  findOne: (filter: any) => Promise<any | null>;
  create: (data: any) => Promise<any>;
  findById: (id: string) => { select: (field: string) => Promise<any | null> };
};

export class AuthService {
  constructor(private readonly userModel?: UserModel) { }

  private async getUserModel(): Promise<UserModel> {
    if (this.userModel) {
      return this.userModel;
    }

    const { User } = await import("../../db/models/user.model");
    return User as unknown as UserModel;
  }

  async register(data: {
    name: string;
    email: string;
    username: string;
    password: string;
  }) {
    const normalizedEmail = data.email.toLowerCase().trim();
    const normalizedUsername = data.username.toLowerCase().trim();
    const User = await this.getUserModel();

    const existingUser = await User.findOne({
      $or: [{ email: normalizedEmail }, { username: normalizedUsername }],
    });

    if (existingUser) {
      if (existingUser.email === normalizedEmail) {
        throw new Error("Email is already registered");
      }
      if (existingUser.username === normalizedUsername) {
        throw new Error("Username is already taken");
      }
    }

    const hashedPassword = await hashPassword(data.password);

    try {
      const user = await User.create({
        name: data.name.trim(),
        email: normalizedEmail,
        username: normalizedUsername,
        password: hashedPassword,
      });

      return {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        username: user.username,
      };
    } catch (error: any) {
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern || {})[0];
        throw new Error(
          field === "email"
            ? "Email is already registered"
            : "Username is already taken"
        );
      }
      throw error;
    }
  }

  async login(data: {
    identifier?: string;
    email?: string;
    username?: string;
    password: string;
  }) {
    const identifier = (data.identifier ?? data.email ?? data.username ?? "")
      .trim()
      .toLowerCase();

    if (!identifier) {
      throw new Error("Invalid email/username or password");
    }

    const User = await this.getUserModel();
    const user = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }],
    });

    if (!user) {
      throw new Error("Invalid email/username or password");
    }

    const isMatch = await verifyPassword(data.password, user.password);
    if (!isMatch) {
      throw new Error("Invalid email/username or password");
    }

    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      username: user.username,
    };
  }

  async getUserById(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Invalid user ID format");
    }

    const User = await this.getUserModel();
    const user = await User.findById(id).select("-password");
    if (!user) {
      throw new Error("User not found");
    }
    return user;
  }
}