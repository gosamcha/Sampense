import type { Category, MonthlyPlan, Transaction } from '../types'

export function monthlyExpenses(transactions: Transaction[], plans: MonthlyPlan[], categories: Category[]) {
  const expenses = [...transactions, ...plans]
  const totals = new Map<number, number>()
  for (const item of expenses) totals.set(item.categoryId, (totals.get(item.categoryId) ?? 0) + item.amount)
  const categoryTotals = categories.map(category => ({ category, amount: totals.get(category.id!) ?? 0 }))
  const known = new Set(categories.map(c => c.id))
  for (const [id, amount] of totals) {
    if (!known.has(id)) categoryTotals.push({ category: {
      id, name: 'Deleted Category', color: '#d1d5db', budgetCycle: 'none', budgetAmount: 0, spendingType: 'variable', order: Number.MAX_SAFE_INTEGER,
    }, amount })
  }
  return { totalExpense: expenses.reduce((sum, item) => sum + item.amount, 0), categoryTotals }
}
