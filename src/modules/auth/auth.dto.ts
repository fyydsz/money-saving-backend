import { t } from "elysia";

export const RegisterDto = t.Object({
  name: t.String({ minLength: 2, maxLength: 50 }),
  email: t.String({ format: "email" }),
  username: t.String({
    minLength: 3,
    maxLength: 30,
    pattern: "^[a-zA-Z0-9_.]+$", // only allow alphanumeric characters, underscores, and dots
  }),
  password: t.String({ minLength: 6, maxLength: 100 }),
});

export const LoginDto = t.Object({
  identifier: t.Optional(t.String({ minLength: 3, maxLength: 100 })),
  email: t.Optional(t.String({ format: "email" })),
  username: t.Optional(t.String({ minLength: 3, maxLength: 30 })),
  password: t.String({ minLength: 1 }),
});