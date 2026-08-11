export type PageName = 'daily' | 'weekly' | 'monthly'
export type BudgetCycle = 'daily' | 'weekly' | 'monthly' | 'none'
export type SpendingType = 'variable' | 'fixed' | 'planned'
export type TransactionSource = 'manual' | 'ai' | 'screenshot'
export type PlanKind = 'fixed' | 'planned'
export type PlanStatus = 'planned' | 'paid'

export interface Category {
  id?: number
  name: string
  color: string
  budgetCycle: BudgetCycle
  budgetAmount: number
  spendingType: SpendingType
  order: number
}

export interface Transaction {
  id?: number
  date: string
  description: string
  merchant?: string
  amount: number
  categoryId: number
  source: TransactionSource
  createdAt: number
}

export interface Income {
  id?: number
  date: string
  description: string
  amount: number
  createdAt: number
}

export interface MonthlyPlan {
  id?: number
  date: string
  description: string
  amount: number
  categoryId: number
  kind: PlanKind
  status: PlanStatus
  createdAt: number
}

export interface MonthlyMemo {
  month: string
  text: string
  updatedAt: number
}

export interface MerchantRule {
  merchantKey: string
  categoryId: number
  updatedAt: number
}

export interface AppSetting {
  key: string
  value: string
}

export interface ThemeColors {
  primaryBg: string
  primaryText: string
  income: string
  expense: string
}

export interface TransactionDraft {
  id?: number
  date: string
  description: string
  merchant: string
  amount: number
  categoryId: number
  source: TransactionSource
}

export interface AiTransactionResult {
  date: string
  description: string
  merchant: string
  amount: number
  categoryId: number
  confidence: number
}
