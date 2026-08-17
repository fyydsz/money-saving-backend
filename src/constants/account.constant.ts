export enum AccountType {
  SAVINGS = "SAVINGS", // Savings
  CREDIT_CARD = "CREDIT_CARD", // Credit Card
  DEPOSIT = "DEPOSIT", // Time Deposit
  INVESTMENT = "INVESTMENT", // Investment (Mutual Funds, Stocks, etc.)
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
  "Bank Mandiri",
  "BRI",
  "BNI",
  "BSI (Bank Syariah Indonesia)",
  "Bank Jago",
  "Blu by BCA Digital",
  "SeaBank",
  "CIMB Niaga",
  "Bank Permata",
  "Bank Danamon",
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
