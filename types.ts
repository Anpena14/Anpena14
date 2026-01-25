
export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE'
}

export enum FinScope {
  PERSONAL = 'PERSONAL',
  BUSINESS = 'BUSINESS'
}

export enum RecurrenceFrequency {
  NONE = 'NONE',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  BIWEEKLY = 'BIWEEKLY',
  MONTHLY = 'MONTHLY',
  ANNUAL = 'ANNUAL'
}

export enum PaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
  TRANSFER = 'TRANSFER',
  OTHER = 'OTHER'
}

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  color: string;
  icon: string;
  isPredefined: boolean;
  scope?: FinScope;
}

export interface CreditCard {
  id: string;
  name: string;
  bank: string;
  lastFour: string;
  limit: number;
  currentBalance: number;
  closingDay: number;
  paymentDay: number;
  scope: FinScope;
  color: string;
}

export interface FixedExpense {
  id: string;
  name: string;
  amount: number;
  categoryId: string;
  paymentMethod: PaymentMethod;
  cardId?: string;
  scope: FinScope;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  scope: FinScope;
  date: string;
  categoryId: string;
  description: string;
  amount: number;
  paymentMethod: PaymentMethod;
  isRecurrent: boolean;
  frequency: RecurrenceFrequency;
  tags: string[];
  receiptUrl?: string;
  cardId?: string;
}

export interface Budget {
  id: string;
  categoryId: string;
  scope: FinScope;
  amount: number;
  month: number;
  year: number;
}

export interface SavingsGoal {
  id: string;
  name: string;
  scope: FinScope;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  color: string;
}
