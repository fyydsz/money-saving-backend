export enum AccountType {
  SAVINGS = "SAVINGS", // Savings
  CREDIT_CARD = "CREDIT_CARD", // Credit Card
  TIME_DEPOSIT = "TIME_DEPOSIT", // Time Deposit
  INVESTMENT = "INVESTMENT", // Investment (Mutual Funds, Stocks, etc.)
  LOAN = "LOAN", // Loan
  PAYLATER = "PAYLATER", // PayLater
  CASH = "CASH", // Cash
  OTHER = "OTHER", // Other
}

export enum ProviderType {
  BANK = "BANK",
  E_WALLET = "E_WALLET",
  CASH = "CASH",
  OTHER = "OTHER",
}

export const POPULAR_BANKS = [
  "BCA",
  "Mandiri",
  "BRI",
  "BNI",
  "BSI",
  "Jago",
  "Blu by BCA Digital",
  "SeaBank",
  "CIMB Niaga",
  "Permata",
  "Danamon",
  "BTN",
  "Jenius (BTPN)",
  "OCBC NISP",
  "Panin Bank",
] as const;

export const POPULAR_EWALLETS = [
  "GoPay",
  "OVO",
  "DANA",
  "ShopeePay",
  "LinkAja",
  "Astrapay",
  "i.saku",
] as const;
