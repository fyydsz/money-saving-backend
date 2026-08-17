export enum CategoryType {
  EXPENSE = "EXPENSE",
  INCOME = "INCOME",
}

export interface ICategoryPreset {
  id: string;
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
  description?: string;
}

export const DEFAULT_CATEGORIES: ICategoryPreset[] = [
  // Expense
  {
    id: "food_beverage",
    name: "Food & Beverage",
    type: CategoryType.EXPENSE,
    icon: "Utensils",
    color: "#F97316",
    description: "Daily meals, snacks, cafes, restaurants, delivery",
  },
  {
    id: "transportation",
    name: "Transportation",
    type: CategoryType.EXPENSE,
    icon: "Car",
    color: "#3B82F6",
    description: "Fuel, ride-hailing, public transit tickets, parking, tolls",
  },
  {
    id: "shopping",
    name: "Shopping & Groceries",
    type: CategoryType.EXPENSE,
    icon: "ShoppingBag",
    color: "#EC4899",
    description: "Monthly groceries, clothing, household supplies",
  },
  {
    id: "housing_utilities",
    name: "Housing & Utilities",
    type: CategoryType.EXPENSE,
    icon: "Home",
    color: "#6366F1",
    description: "Rent/housing, electricity, water, internet, utilities",
  },
  {
    id: "health",
    name: "Health & Medical",
    type: CategoryType.EXPENSE,
    icon: "HeartPulse",
    color: "#EF4444",
    description: "Medications, doctor consultations, vitamins, medical care",
  },
  {
    id: "beauty",
    name: "Personal Care & Beauty",
    type: CategoryType.EXPENSE,
    icon: "Sparkles",
    color: "#D946EF",
    description: "Skincare, haircut, cosmetics, spa",
  },
  {
    id: "education",
    name: "Education & Learning",
    type: CategoryType.EXPENSE,
    icon: "GraduationCap",
    color: "#10B981",
    description: "Courses, books, certifications, tuition",
  },
  {
    id: "entertainment",
    name: "Entertainment & Recreation",
    type: CategoryType.EXPENSE,
    icon: "Gamepad2",
    color: "#8B5CF6",
    description: "Movies, streaming subscriptions, gaming, vacation, hobbies",
  },
  {
    id: "gift_donation",
    name: "Gifts & Donations",
    type: CategoryType.EXPENSE,
    icon: "Gift",
    color: "#14B8A6",
    description: "Charity, gifts, donations, treating friends/family",
  },

  // Income
  {
    id: "salary_income",
    name: "Salary & Primary Income",
    type: CategoryType.INCOME,
    icon: "Wallet",
    color: "#22C55E",
    description: "Monthly salary, wage, bonuses",
  },
  {
    id: "side_income",
    name: "Freelance & Business",
    type: CategoryType.INCOME,
    icon: "Briefcase",
    color: "#06B6D4",
    description: "Side projects, business sales, freelance gigs",
  },
  {
    id: "savings_investment",
    name: "Savings & Investments",
    type: CategoryType.INCOME,
    icon: "TrendingUp",
    color: "#84CC16",
    description: "Dividends, investment returns, savings withdrawal",
  },

  // Other
  {
    id: "other_expense",
    name: "Other Expense",
    type: CategoryType.EXPENSE,
    icon: "MoreHorizontal",
    color: "#64748B",
    description: "Expenses not defined in other categories",
  },
  {
    id: "other_income",
    name: "Other Income",
    type: CategoryType.INCOME,
    icon: "PlusCircle",
    color: "#0EA5E9",
    description: "Unexpected income or other sources",
  },
];
