import { Elysia, t } from "elysia";
import { authGuard } from "../../plugins/auth.plugin";
import { AccountService } from "./account.service";
import { CreateAccountDto, UpdateAccountDto } from "./account.dto";

const accountService = new AccountService();

export const accountController = new Elysia({ prefix: "/accounts" })
  .use(authGuard)
  // Presets endpoint (public/authenticated)
  .get("/presets", () => {
    return {
      presets: accountService.getPresets(),
    };
  })
  // Protected endpoints
  .guard({ isAuth: true }, (app) =>
    app
      .get("/", async ({ user, set }: any) => {
        try {
          const result = await accountService.getUserAccounts(user.id);
          return result;
        } catch (err: any) {
          set.status = 400;
          return { error: err.message };
        }
      })
      .get("/:id", async ({ user, params: { id }, set }: any) => {
        try {
          const account = await accountService.getAccountById(user.id, id);
          return { account };
        } catch (err: any) {
          set.status = 404;
          return { error: err.message };
        }
      })
      .post(
        "/",
        async ({ user, body, set }: any) => {
          try {
            const account = await accountService.createAccount(user.id, body);
            set.status = 201;
            return {
              message: "Account created successfully",
              account,
            };
          } catch (err: any) {
            set.status = 400;
            return { error: err.message };
          }
        },
        {
          body: CreateAccountDto,
        }
      )
      .put(
        "/:id",
        async ({ user, params: { id }, body, set }: any) => {
          try {
            const account = await accountService.updateAccount(user.id, id, body);
            return {
              message: "Account updated successfully",
              account,
            };
          } catch (err: any) {
            set.status = 400;
            return { error: err.message };
          }
        },
        {
          body: UpdateAccountDto,
        }
      )
      .delete("/:id", async ({ user, params: { id }, set }: any) => {
        try {
          const result = await accountService.deleteAccount(user.id, id);
          return result;
        } catch (err: any) {
          set.status = 400;
          return { error: err.message };
        }
      })
  );
