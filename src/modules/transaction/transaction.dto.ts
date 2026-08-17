import { t } from "elysia";
import { TransactionType } from "./transaction.service";

export const CreateTransactionDto = t.Object({
  accountId: t.String({ minLength: 1 }),
  amount: t.Number(), // Positive for income/top-up, negative for expense/spending
  type: t.Optional(t.Enum(TransactionType)),
  date: t.Optional(t.String()), // ISO date string e.g. "2026-08-16T14:00:00Z" or "2026-08-16"
  description: t.String({ minLength: 1, maxLength: 200 }),
  category: t.String({ minLength: 1 }),
  labels: t.Optional(t.Array(t.String())),
  notes: t.Optional(t.String()),
});

export const UpdateTransactionDto = t.Object({
  accountId: t.Optional(t.String({ minLength: 1 })),
  amount: t.Optional(t.Number()),
  type: t.Optional(t.Enum(TransactionType)),
  date: t.Optional(t.String()),
  description: t.Optional(t.String({ minLength: 1, maxLength: 200 })),
  category: t.Optional(t.String({ minLength: 1 })),
  labels: t.Optional(t.Array(t.String())),
  notes: t.Optional(t.String()),
});

export const TransactionQueryDto = t.Object({
  accountId: t.Optional(t.String()),
  category: t.Optional(t.String()),
  label: t.Optional(t.String()),
  type: t.Optional(t.String()),
  search: t.Optional(t.String()),
  startDate: t.Optional(t.String()),
  endDate: t.Optional(t.String()),
  page: t.Optional(t.String()),
  limit: t.Optional(t.String()),
});

export type CreateTransactionInput = typeof CreateTransactionDto.static;
export type UpdateTransactionInput = typeof UpdateTransactionDto.static;
export type TransactionQueryInput = typeof TransactionQueryDto.static;
