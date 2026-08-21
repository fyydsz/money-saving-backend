import { t } from "elysia";
import { AccountType, ProviderType } from "../../constants/account.constant";

export const CreateVaultDto = t.Object({
  name: t.String({ minLength: 1, maxLength: 100 }),
  accountType: t.Enum(AccountType),
  providerType: t.Enum(ProviderType),
  providerName: t.String({ minLength: 1, maxLength: 100 }),
  balance: t.Optional(
    t.Number({
      minimum: 0,
      error: "Nominal saldo tidak boleh bernilai negatif (minimal 0)",
      default: 0,
    })
  ),
  currency: t.Optional(t.String({ default: "IDR" })),
  color: t.Optional(t.String()),
  isDefault: t.Optional(t.Boolean({ default: false })),
});

export const UpdateVaultDto = t.Object({
  name: t.Optional(t.String({ minLength: 1, maxLength: 100 })),
  accountType: t.Optional(t.Enum(AccountType)),
  providerType: t.Optional(t.Enum(ProviderType)),
  providerName: t.Optional(t.String({ minLength: 1, maxLength: 100 })),
  currency: t.Optional(t.String()),
  color: t.Optional(t.String()),
  isDefault: t.Optional(t.Boolean()),
});

export type CreateVaultInput = typeof CreateVaultDto.static;
export type UpdateVaultInput = typeof UpdateVaultDto.static;
