import { Elysia } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { AuthService } from "./auth.service";
import { LoginDto, RegisterDto } from "./auth.dto";

const authService = new AuthService();

export const authController = new Elysia({ prefix: "/auth" })
  .use(
    jwt({
      name: "jwt",
      secret: process.env.JWT_SECRET!,
      exp: "7d",
    })
  )
  .post(
    "/register",
    async ({ body, set }) => {
      try {
        const user = await authService.register(body);
        set.status = 201;
        return {
          message: "User registered successfully",
          user,
        };
      } catch (err: any) {
        set.status = 400;
        return { error: err.message };
      }
    },
    { body: RegisterDto }
  )
  .post(
    "/login",
    async ({ body, jwt, cookie: { auth_token }, set }) => {
      try {
        const user = await authService.login(body);
        const token = await jwt.sign({ id: user.id, email: user.email });

        // Store token in HttpOnly cookie
        auth_token.set({
          value: token,
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 7 * 86400, // 7 days
          path: "/",
        });

        return {
          message: "Login successful",
          user,
          token, // Optional: send token for Bearer authentication in non-browser clients
        };
      } catch (err: any) {
        set.status = 401;
        return { error: err.message };
      }
    },
    { body: LoginDto }
  )
  .post(
    "/logout",
    ({ cookie: { auth_token }, set }) => {
      auth_token.remove();

      set.status = 200;
      return { message: "Logout successful" };
    }
  )
  ;