-- Add check constraint to ensure bank_accounts balance cannot be negative
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_balance_non_negative" CHECK ("balance" >= 0);