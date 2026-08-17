import { prisma } from "../../db";
import { hashPassword, verifyPassword } from "../../utils/password";

export class AuthService {
  async register(data: {
    name: string;
    email: string;
    username: string;
    password: string;
  }) {
    const normalizedEmail = data.email.toLowerCase().trim();
    const normalizedUsername = data.username.toLowerCase().trim();

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: normalizedEmail }, { username: normalizedUsername }],
      },
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

    const user = await prisma.user.create({
      data: {
        name: data.name.trim(),
        email: normalizedEmail,
        username: normalizedUsername,
        password: hashedPassword,
      },
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
    };
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

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { username: identifier }],
      },
    });

    if (!user || !user.password) {
      throw new Error("Invalid email/username or password");
    }

    const isMatch = await verifyPassword(data.password, user.password);
    if (!isMatch) {
      throw new Error("Invalid email/username or password");
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
    };
  }

  async getUserById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        image: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    return user;
  }
}