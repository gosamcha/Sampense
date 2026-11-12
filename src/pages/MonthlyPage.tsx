import { Plus } from 'lucide-react'
import { toBlob } from 'html-to-image'
import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useRef, useState } from 'react'
import { db } from '../db'
import type {
  Category,
  Income,
  MonthlyPlan,
  ThemeColors,
} from '../types'
import {
  addDays,
  dateKeysBetween,
  dayNumber,
  endOfMonth,
  formatMonthTitle,
  monthKey,
  parseLocalDate,
  startOfMonth,
} from '../utils/date'
import { clamp, formatKRW, hexWithAlpha } from '../utils/money'
import ProgressBar from '../components/ProgressBar'
import IncomeModal from '../components/IncomeModal'
import PlanModal from '../components/PlanModal'
import { monthlyExpenses } from '../utils/monthly'

type MonthlyPageProps = {
  selectedDate: string
  categories: Category[]
  theme: ThemeColors
  captureRequestToken: number
  onOpenDaily: (date: string) => void
}

export default function MonthlyPage({
  selectedDate,
  categories,
  theme,
  captureRequestToken,
  onOpenDaily,
}: MonthlyPageProps) {
  const monthStart = startOfMonth(selectedDate)
  const monthEnd = endOfMonth(selectedDate)
  const [incomeDraft, setIncomeDraft] = useState<Income | null | undefined>(undefined)
  const [planDraft, setPlanDraft] = useState<MonthlyPlan | null | undefined>(undefined)
  const [memoText, setMemoText] = useState('')
  const captureRef = useRef<HTMLDivElement>(null)
  const lastCaptureToken = useRef(0)
  const currentMonth = monthKey(selectedDate)

  const transactions =
    useLiveQuery(
      () =>
        db.transactions
          .where('date')
          .between(monthStart, monthEnd, true, true)
          .toArray(),
      [monthStart, monthEnd],
    ) ?? []

  const incomes =
    useLiveQuery(
      () =>
        db.incomes
          .where('date')
          .between(monthStart, monthEnd, true, true)
          .toArray(),
      [monthStart, monthEnd],
    ) ?? []

  const plans =
    useLiveQuery(
      () =>
        db.monthlyPlans
          .where('date')
          .between(monthStart, monthEnd, true, true)
          .toArray(),
      [monthStart, monthEnd],
    ) ?? []

  const storedMemo = useLiveQuery(
    () => db.monthlyMemos.get(currentMonth),
    [currentMonth],
  )

  useEffect(() => {
    setMemoText(storedMemo?.text ?? '')
  }, [currentMonth, storedMemo?.text])

  const { totalExpense, categoryTotals } = useMemo(
    () => monthlyExpenses(transactions, plans, categories),
    [transactions, plans, categories],
  )
  const totalIncome = incomes.reduce((sum, item) => sum + item.amount, 0)
  const balance = totalIncome - totalExpense

  const dailyTotals = useMemo(() => {
    const map = new Map<string, number>()
    for (const item of transactions) {
      map.set(item.date, (map.get(item.date) ?? 0) + item.amount)
    }
    return map
  }, [transactions])

  const maxDaily = Math.max(...dailyTotals.values(), 1)

  const monthlyBudgets = categories.filter(
    (category) =>
      category.id &&
      category.budgetCycle === 'monthly' &&
      category.budgetAmount > 0,
  )

  const calendarCells = useMemo(() => {
    const first = parseLocalDate(monthStart)
    const mondayIndex = first.getDay() === 0 ? 6 : first.getDay() - 1
    const dates = dateKeysBetween(monthStart, monthEnd)
    const cells: Array<string | null> = Array.from(
      { length: mondayIndex },
      () => null,
    )
    cells.push(...dates)
    while (cells.length % 7 !== 0) cells.push(null)
    return cells
  }, [monthStart, monthEnd])

  useEffect(() => {
    if (
      captureRequestToken <= 0 ||
      captureRequestToken === lastCaptureToken.current
    ) {
      return
    }

    lastCaptureToken.current = captureRequestToken
    void saveCapture()
  }, [captureRequestToken])

  async function saveCapture() {
    if (!captureRef.current) return

    try {
      await document.fonts.ready
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() =>
          requestAnimationFrame(() => resolve()),
        ),
      )

      const blob = await toBlob(captureRef.current, {
        width: 1080,
        height: captureRef.current.scrollHeight,
        pixelRatio: 1,
        backgroundColor: '#ffffff',
        cacheBust: false,
      })

      if (!blob) throw new Error('Could not create image')

      const fileName = `sampense-${monthKey(selectedDate)}.png`
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (error) {
      console.error(error)
      alert('An error occurred while saving the monthly image')
    }
  }

  async function saveMonthlyMemo() {
    const text = memoText.trim()

    if (!text) {
      await db.monthlyMemos.delete(currentMonth)
      return
    }

    await db.monthlyMemos.put({
      month: currentMonth,
      text,
      updatedAt: Date.now(),
    })
  }

  return (
    <div className="page-content">
      <section className="monthly-summary-grid">
        <SummaryCard label="INCOME" value={totalIncome} color={theme.income} />
        <SummaryCard label="EXPENSE" value={totalExpense} color={theme.expense} />
        <SummaryCard
          label="BALANCE"
          value={balance}
          color={balance >= 0 ? theme.primaryBg : theme.expense}
          wide
        />
      </section>

      <section className="card">
        <div className="section-heading">
          <div>
            <div className="eyebrow">HEATMAP</div>
            <h2>Monthly Spending</h2>
          </div>
        </div>

        <Heatmap
          cells={calendarCells}
          dailyTotals={dailyTotals}
          maxDaily={maxDaily}
          theme={theme}
          onOpenDaily={onOpenDaily}
        />
      </section>

      <section className="card monthly-memo-card">
        <div className="section-heading">
          <div>
            <div className="eyebrow">MONTHLY MEMO</div>
            <h2>For This Month</h2>
          </div>
        </div>

        <textarea
          className="monthly-memo-textarea"
          value={memoText}
          onChange={(event) => setMemoText(event.target.value)}
          onBlur={() => void saveMonthlyMemo()}
          placeholder="A short note about month"
          maxLength={500}
          rows={4}
        />
      </section>

      <section className="card">
        <div className="section-heading">
          <div>
            <div className="eyebrow">INCOME</div>
            <h2>Monthly Income</h2>
          </div>
          <button
            type="button"
            className="small-add-button"
            style={{ color: theme.primaryBg }}
            onClick={() => setIncomeDraft(null)}
          >
            <Plus size={17} strokeWidth={3} />
            ADD
          </button>
        </div>

        {incomes.length === 0 ? (
          <div className="empty-state">No income added</div>
        ) : (
          <div className="simple-list">
            {[...incomes]
              .sort((a, b) => a.date.localeCompare(b.date))
              .map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="simple-row row-button"
                  onClick={() => setIncomeDraft(item)}
                >
                  <div>
                    <strong>{item.description}</strong>
                    <span>{item.date.slice(5).replace('-', '/')}</span>
                  </div>
                  <strong style={{ color: theme.income }}>
                    +{formatKRW(item.amount)}
                  </strong>
                </button>
              ))}
          </div>
        )}
      </section>

      {monthlyBudgets.length > 0 && (
        <section className="card">
          <div className="section-heading">
            <div>
              <div className="eyebrow">MONTHLY BUDGET</div>
              <h2>Budget Progress</h2>
            </div>
          </div>
          <div className="budget-card-list">
            {monthlyBudgets.map((category) => {
              const spent = categoryTotals.find(item => item.category.id === category.id)?.amount ?? 0
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

      <section className="card">
        <div className="section-heading">
          <div>
            <div className="eyebrow">FIXED & PLANNED</div>
            <h2>Monthly Items</h2>
            <p className="monthly-items-note">Included in Expense and Monthly Summary, not the spending calendar.</p>
          </div>
          <button
            type="button"
            className="small-add-button"
            style={{ color: theme.primaryBg }}
            onClick={() => setPlanDraft(null)}
          >
            <Plus size={17} strokeWidth={3} />
            ADD
          </button>
        </div>

        {plans.length === 0 ? (
          <div className="empty-state">No fixed or planned items</div>
        ) : (
          <div className="monthly-plan-table">
            <div className="monthly-plan-head">
              <span>DATE</span>
              <span>ITEM</span>
              <span>AMOUNT</span>
            </div>
            {[...plans]
              .sort((a, b) => a.date.localeCompare(b.date))
              .map((plan) => {
                const category = categories.find(
                  (item) => item.id === plan.categoryId,
                )
                return (
                  <button
                    type="button"
                    key={plan.id}
                    className="monthly-plan-row"
                    onClick={() => setPlanDraft(plan)}
                  >
                    <span>{plan.date.slice(5).replace('-', '/')}</span>
                    <span>
                      <strong>{plan.description}</strong>
                      <small>
                        {category?.name ?? 'Deleted Category'} ·{' '}
                        {plan.kind.toUpperCase()} · {plan.status.toUpperCase()}
                      </small>
                    </span>
                    <strong>{formatKRW(plan.amount)}</strong>
                  </button>
                )
              })}
          </div>
        )}
      </section>

      <section className="card">
        <div className="section-heading">
          <div>
            <div className="eyebrow">CATEGORY</div>
            <h2>Monthly Summary</h2>
          </div>
        </div>

        {categoryTotals.length === 0 ? (
          <div className="empty-state">No spending this month</div>
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

      {incomeDraft !== undefined && (
        <IncomeModal
          initial={incomeDraft}
          defaultDate={selectedDate}
          theme={theme}
          onClose={() => setIncomeDraft(undefined)}
        />
      )}

      {planDraft !== undefined && (
        <PlanModal
          initial={planDraft}
          defaultDate={selectedDate}
          categories={categories}
          theme={theme}
          onClose={() => setPlanDraft(undefined)}
        />
      )}

      <MonthlyCapture
        captureRef={captureRef}
        selectedDate={selectedDate}
        theme={theme}
        categories={categories}
        totalIncome={totalIncome}
        totalExpense={totalExpense}
        balance={balance}
        calendarCells={calendarCells}
        dailyTotals={dailyTotals}
        maxDaily={maxDaily}
        categoryTotals={categoryTotals}
        plans={plans}
        memoText={memoText}
      />
    </div>
  )
}

function SummaryCard({
  label,
  value,
  color,
  wide = false,
}: {
  label: string
  value: number
  color: string
  wide?: boolean
}) {
  return (
    <div className={`summary-card ${wide ? 'wide' : ''}`}>
      <div className="eyebrow">{label}</div>
      <strong style={{ color }}>{formatKRW(value)}</strong>
    </div>
  )
}

function Heatmap({
  cells,
  dailyTotals,
  maxDaily,
  theme,
  onOpenDaily,
  compactFiveRows = false,
}: {
  cells: Array<string | null>
  dailyTotals: Map<string, number>
  maxDaily: number
  theme: ThemeColors
  onOpenDaily: (date: string) => void
  compactFiveRows?: boolean
}) {
  const displayCells = compactFiveRows
    ? cells.filter((date): date is string => Boolean(date))
    : cells

  return (
    <div className={`heatmap ${compactFiveRows ? 'compact-five-rows' : ''}`}>
      {!compactFiveRows && (
        <div className="heatmap-weekdays">
          {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
      )}
      <div className="heatmap-grid">
        {displayCells.map((date, index) => {
          if (!date) return <span key={`blank-${index}`} className="heatmap-cell blank" />

          const amount = dailyTotals.get(date) ?? 0
          const ratio = amount / maxDaily
          const opacity = amount === 0 ? 0.05 : 0.18 + clamp(ratio) * 0.67

          return (
            <button
              type="button"
              key={date}
              className="heatmap-cell"
              style={{
                backgroundColor: hexWithAlpha(theme.primaryBg, opacity),
                borderColor: hexWithAlpha(theme.primaryBg, amount > 0 ? 0.22 : 0.08),
              }}
              onClick={() => onOpenDaily(date)}
              aria-label={`${date} ${formatKRW(amount)}`}
            >
              <strong>{dayNumber(date)}</strong>
              <small>{amount > 0 ? `${Math.round(amount / 1000)}k` : ''}</small>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function MonthlyCapture({
  captureRef,
  selectedDate,
  theme,
  totalIncome,
  totalExpense,
  balance,
  calendarCells,
  dailyTotals,
  maxDaily,
  categoryTotals,
  plans,
  memoText,
}: {
  captureRef: React.RefObject<HTMLDivElement | null>
  selectedDate: string
  theme: ThemeColors
  categories: Category[]
  totalIncome: number
  totalExpense: number
  balance: number
  calendarCells: Array<string | null>
  dailyTotals: Map<string, number>
  maxDaily: number
  categoryTotals: Array<{ category: Category; amount: number }>
  plans: MonthlyPlan[]
  memoText: string
}) {
  return (
    <div className="capture-stage" aria-hidden="true">
      <div ref={captureRef} className="monthly-capture">
        <div className="capture-header">
          <div>
            <div className="capture-brand">SAMPENSE</div>
            <h1 style={{ color: theme.primaryBg }}>
              {formatMonthTitle(selectedDate)}
            </h1>
          </div>
        </div>

        <div className="capture-summary">
          <SummaryCard label="INCOME" value={totalIncome} color={theme.income} />
          <SummaryCard label="EXPENSE" value={totalExpense} color={theme.expense} />
          <SummaryCard
            label="BALANCE"
            value={balance}
            color={balance >= 0 ? theme.primaryBg : theme.expense}
          />
        </div>

        <div className="capture-grid">
          <section className="capture-panel heat-panel">
            <div className="capture-panel-title">MONTHLY SPENDING</div>
            <Heatmap
              cells={calendarCells}
              dailyTotals={dailyTotals}
              maxDaily={maxDaily}
              theme={theme}
              onOpenDaily={() => {}}
              compactFiveRows
            />
          </section>

          <section className="capture-panel capture-memo">
            <div className="capture-panel-title">MONTHLY MEMO</div>
            <div className={memoText.trim() ? 'capture-memo-text' : 'capture-empty'}>
              {memoText.trim() || 'NO MEMO'}
            </div>
          </section>

          <section className="capture-panel">
            <div className="capture-panel-title">MONTHLY SUMMARY</div>
            <div className="capture-category-list">
              {categoryTotals.map(({ category, amount }) => (
                <div key={category.id} className="capture-category-row">
                  <div>
                    <span
                      className="category-dot"
                      style={{ backgroundColor: category.color }}
                    />
                    <strong>{category.name}</strong>
                  </div>
                  <strong>{formatKRW(amount)}</strong>
                </div>
              ))}
              {categoryTotals.length === 0 && (
                <div className="capture-empty">NO SPENDING</div>
              )}
            </div>
          </section>

          <section className="capture-panel capture-plans">
            <div className="capture-panel-title">FIXED & PLANNED</div>
            <div className="capture-plan-list">
              {[...plans]
                .sort((a, b) => a.date.localeCompare(b.date))
                .slice(0, 7)
                .map((plan) => (
                  <div key={plan.id} className="capture-plan-row">
                    <span>{plan.date.slice(5).replace('-', '/')}</span>
                    <strong>{plan.description}</strong>
                    <span>{formatKRW(plan.amount)}</span>
                  </div>
                ))}
              {plans.length === 0 && (
                <div className="capture-empty">NO PLANNED ITEMS</div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
