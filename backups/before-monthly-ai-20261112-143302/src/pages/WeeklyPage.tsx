import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { db } from '../db'
import type { Category, ThemeColors } from '../types'
import {
  dateKeysBetween,
  endOfMonth,
  endOfWeek,
  startOfMonth,
  startOfWeek,
  weekdayShort,
} from '../utils/date'
import { formatKRW } from '../utils/money'
import ProgressBar from '../components/ProgressBar'

type WeeklyPageProps = {
  selectedDate: string
  categories: Category[]
  theme: ThemeColors
  onOpenDaily: (date: string) => void
}

export default function WeeklyPage({
  selectedDate,
  categories,
  theme,
  onOpenDaily,
}: WeeklyPageProps) {
  const weekStart = startOfWeek(selectedDate)
  const weekEnd = endOfWeek(selectedDate)
  const dates = dateKeysBetween(weekStart, weekEnd)

  const weekTransactions =
    useLiveQuery(
      () =>
        db.transactions
          .where('date')
          .between(weekStart, weekEnd, true, true)
          .toArray(),
      [weekStart, weekEnd],
    ) ?? []

  const monthStart = startOfMonth(selectedDate)
  const monthEnd = endOfMonth(selectedDate)

  const monthTransactions =
    useLiveQuery(
      () =>
        db.transactions
          .where('date')
          .between(monthStart, monthEnd, true, true)
          .toArray(),
      [monthStart, monthEnd],
    ) ?? []

  const total = weekTransactions.reduce((sum, item) => sum + item.amount, 0)

  const dailyTotals = dates.map((date) => ({
    date,
    amount: weekTransactions
      .filter((item) => item.date === date)
      .reduce((sum, item) => sum + item.amount, 0),
  }))

  const maxDaily = Math.max(...dailyTotals.map((item) => item.amount), 1)

  const categoryTotals = useMemo(
    () =>
      categories
        .map((category) => ({
          category,
          amount: weekTransactions
            .filter((item) => item.categoryId === category.id)
            .reduce((sum, item) => sum + item.amount, 0),
        }))
        .filter((item) => item.amount > 0)
        .sort((a, b) => b.amount - a.amount),
    [categories, weekTransactions],
  )

  const weeklyBudgets = categories.filter(
    (category) =>
      category.id &&
      category.budgetCycle === 'weekly' &&
      category.budgetAmount > 0,
  )

  const monthlyChecks = categories
    .filter(
      (category) =>
        category.id &&
        category.budgetCycle === 'monthly' &&
        category.budgetAmount > 0,
    )
    .map((category) => {
      const thisWeek = weekTransactions
        .filter((item) => item.categoryId === category.id)
        .reduce((sum, item) => sum + item.amount, 0)

      const thisMonth = monthTransactions
        .filter((item) => item.categoryId === category.id)
        .reduce((sum, item) => sum + item.amount, 0)

      return { category, thisWeek, thisMonth }
    })
    .filter((item) => item.thisWeek > 0)
    .sort((a, b) => b.thisWeek - a.thisWeek)

  return (
    <div className="page-content">
      <section className="card weekly-total-card">
        <div className="eyebrow">THIS WEEK</div>
        <div className="hero-money">{formatKRW(total)}</div>
        <div className="subtle-copy">
          {weekTransactions.length} transactions
        </div>
      </section>

      <section className="card">
        <div className="section-heading">
          <div>
            <div className="eyebrow">7 DAYS</div>
            <h2>Spending Flow</h2>
          </div>
        </div>

        <div className="week-bars">
          {dailyTotals.map((item) => (
            <button
              key={item.date}
              type="button"
              className="week-bar-item"
              onClick={() => onOpenDaily(item.date)}
            >
              <div className="week-bar-money">
                {item.amount > 0 ? `${Math.round(item.amount / 1000)}k` : ''}
              </div>
              <div className="week-bar-track">
                <div
                  className="week-bar-fill"
                  style={{
                    height: `${Math.max(
                      item.amount > 0 ? 10 : 0,
                      (item.amount / maxDaily) * 100,
                    )}%`,
                    backgroundColor: theme.primaryBg,
                  }}
                />
              </div>
              <strong>{weekdayShort(item.date)}</strong>
              <span>{item.date.slice(8)}</span>
            </button>
          ))}
        </div>
      </section>

      {weeklyBudgets.length > 0 && (
        <section className="card">
          <div className="section-heading">
            <div>
              <div className="eyebrow">WEEKLY BUDGET</div>
              <h2>Budget Progress</h2>
            </div>
          </div>

          <div className="budget-card-list">
            {weeklyBudgets.map((category) => {
              const spent = weekTransactions
                .filter((item) => item.categoryId === category.id)
                .reduce((sum, item) => sum + item.amount, 0)

              return (
                <div key={category.id} className="budget-progress-row">
                  <div className="budget-progress-head">
                    <div className="category-label">
                      <span
                        className="category-dot"
                        style={{ backgroundColor: category.color }}
                      />
                      <strong>{category.name}</strong>
                    </div>
                    <span>
                      {formatKRW(spent)} / {formatKRW(category.budgetAmount)}
                    </span>
                  </div>
                  <ProgressBar
                    value={spent / category.budgetAmount}
                    color={category.color}
                  />
                </div>
              )
            })}
          </div>
        </section>
      )}

      {monthlyChecks.length > 0 && (
        <section className="card">
          <div className="section-heading">
            <div>
              <div className="eyebrow">MONTHLY CATEGORIES</div>
              <h2>This Week's Impact</h2>
            </div>
          </div>

          <div className="simple-list">
            {monthlyChecks.map(({ category, thisWeek, thisMonth }) => (
              <div key={category.id} className="simple-row">
                <div className="category-label">
                  <span
                    className="category-dot"
                    style={{ backgroundColor: category.color }}
                  />
                  <div>
                    <strong>{category.name}</strong>
                    <span>
                      {formatKRW(thisMonth)} / {formatKRW(category.budgetAmount)} monthly
                    </span>
                  </div>
                </div>
                <strong>{formatKRW(thisWeek)}</strong>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="card">
        <div className="section-heading">
          <div>
            <div className="eyebrow">CATEGORY</div>
            <h2>Weekly Summary</h2>
          </div>
        </div>

        {categoryTotals.length === 0 ? (
          <div className="empty-state">No spending this week</div>
        ) : (
          <div className="simple-list">
            {categoryTotals.map(({ category, amount }) => (
              <div key={category.id} className="simple-row">
                <div className="category-label">
                  <span
                    className="category-dot"
                    style={{ backgroundColor: category.color }}
                  />
                  <strong>{category.name}</strong>
                </div>
                <strong>{formatKRW(amount)}</strong>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
