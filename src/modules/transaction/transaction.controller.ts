import { Elysia } from "elysia";
import { authGuard } from "../../plugins/auth.plugin";
import { TransactionService } from "./transaction.service";
import {
  CreateTransactionDto,
  UpdateTransactionDto,
  TransactionQueryDto,
} from "./transaction.dto";

const service = new TransactionService();

export const transactionController = new Elysia({ prefix: "/transactions" })
  .use(authGuard)
  .guard({ isAuth: true }, (app) =>
    app
      .get(
        "/",
        async ({ user, query, set }: any) => {
          try {
            return await service.getTransactions(user.id, query);
          } catch (err: any) {
            set.status = 400;
            return { error: err.message };
          }
        },
        {
          query: TransactionQueryDto,
        }
      )
      .get("/summary", async ({ user, query, set }: any) => {
        try {
          return await service.getSummary(user.id, query);
        } catch (err: any) {
          set.status = 400;
          return { error: err.message };
        }
      })
      .get("/:id", async ({ user, params: { id }, set }: any) => {
        try {
          const transaction = await service.getTransactionById(user.id, id);
          return { transaction };
        } catch (err: any) {
          set.status = 404;
          return { error: err.message };
        }
      })
      .post(
        "/",
        async ({ user, body, set }: any) => {
          try {
            const transaction = await service.createTransaction(user.id, body);
            set.status = 201;
            return {
              message: "Transaction created successfully",
              transaction,
            };
          } catch (err: any) {
            set.status = 400;
            return { error: err.message };
          }
        },
        {
          body: CreateTransactionDto,
        }
      )
      .put(
        "/:id",
        async ({ user, params: { id }, body, set }: any) => {
          try {
            const transaction = await service.updateTransaction(user.id, id, body);
            return {
              message: "Transaction updated successfully",
              transaction,
            };
          } catch (err: any) {
            set.status = 400;
            return { error: err.message };
          }
        },
        {
          body: UpdateTransactionDto,
        }
      )
      .delete("/:id", async ({ user, params: { id }, set }: any) => {
        try {
          return await service.deleteTransaction(user.id, id);
        } catch (err: any) {
          set.status = 400;
          return { error: err.message };
        }
      })
  );
