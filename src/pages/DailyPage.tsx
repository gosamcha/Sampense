import { Camera, Plus, Sparkles } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useRef, useState } from 'react'
import { db } from '../db'
import type {
  AiTransactionResult,
  Category,
  ThemeColors,
  Transaction,
  TransactionDraft,
} from '../types'
import {
  endOfMonth,
  endOfWeek,
  isValidDateKey,
  startOfMonth,
  startOfWeek,
} from '../utils/date'
import { imageFileToDataUrl } from '../utils/image'
import { formatKRW } from '../utils/money'
import ProgressBar from '../components/ProgressBar'
import TransactionModal from '../components/TransactionModal'
import ImportReviewModal from '../components/ImportReviewModal'
import { cleanDescription, parseKnownMerchant, splitTrailingPrice } from '../utils/expenseInput'
import { requestAi } from '../utils/aiRequest'

type DailyPageProps = {
  selectedDate: string
  categories: Category[]
  theme: ThemeColors
}

export default function DailyPage({
  selectedDate,
  categories,
  theme,
}: DailyPageProps) {
  const [aiText, setAiText] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiNotice, setAiNotice] = useState('')
  const [draft, setDraft] = useState<TransactionDraft | null>(null)
  const [reviewItems, setReviewItems] = useState<AiTransactionResult[] | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  const transactions =
    useLiveQuery(
      () =>
        db.transactions
          .where('date')
          .equals(selectedDate)
          .sortBy('createdAt'),
      [selectedDate],
    ) ?? []

  const merchantRules =
    useLiveQuery(() => db.merchantRules.toArray(), []) ?? []

  const budgetTransactions =
    useLiveQuery(
      async () => {
        const weekStart = startOfWeek(selectedDate)
        const weekEnd = endOfWeek(selectedDate)
        const monthStart = startOfMonth(selectedDate)
        const monthEnd = endOfMonth(selectedDate)
        const start = weekStart < monthStart ? weekStart : monthStart
        const end = weekEnd > monthEnd ? weekEnd : monthEnd
        return db.transactions.where('date').between(start, end, true, true).toArray()
      },
      [selectedDate],
    ) ?? []

  const todayTotal = transactions.reduce((sum, item) => sum + item.amount, 0)

  const budgetCards = useMemo(() => {
    return categories
      .filter(
        (category) =>
          category.id &&
          category.budgetCycle !== 'none' &&
          category.budgetAmount > 0,
      )
      .map((category) => {
        let start = selectedDate
        let end = selectedDate

        if (category.budgetCycle === 'weekly') {
          start = startOfWeek(selectedDate)
          end = endOfWeek(selectedDate)
        } else if (category.budgetCycle === 'monthly') {
          start = startOfMonth(selectedDate)
          end = endOfMonth(selectedDate)
        }

        const spent = budgetTransactions
          .filter(
            (item) =>
              item.categoryId === category.id &&
              item.date >= start &&
              item.date <= end,
          )
          .reduce((sum, item) => sum + item.amount, 0)

        return {
          category,
          spent,
          ratio: spent / category.budgetAmount,
        }
      })
      .sort((a, b) => b.ratio - a.ratio)
      .slice(0, 4)
  }, [budgetTransactions, categories, selectedDate])

  function openManual() {
    const fallback = categories.find((category) => category.name === 'ETC') ?? categories[0]
    if (!fallback?.id) return

    setDraft({
      date: selectedDate,
      description: '',
      merchant: '',
      amount: 0,
      categoryId: fallback.id,
      source: 'manual',
    })
  }

  function editTransaction(item: Transaction) {
    if (!item.id) return
    setDraft({
      id: item.id,
      date: item.date,
      description: item.description,
      merchant: item.merchant ?? '',
      amount: item.amount,
      categoryId: item.categoryId,
      source: item.source,
    })
  }

  async function classifyText() {
    const text = aiText.trim()
    if (!text || aiLoading) return
    setAiNotice('')

    const localMatch = merchantRules
      .filter((rule) => rule.merchantKey.length >= 2)
      .sort((a, b) => b.merchantKey.length - a.merchantKey.length)
      .find((rule) => categories.some(c => c.id === rule.categoryId) && parseKnownMerchant(text, rule.merchantKey))
    const localParsed = localMatch && parseKnownMerchant(text, localMatch.merchantKey)

    if (localMatch && localParsed) {
      setDraft({
        date: selectedDate,
        ...localParsed,
        categoryId: localMatch.categoryId,
        source: 'ai',
      })
      setAiText('')
      return
    }

    setAiLoading(true)

    try {
      const result = await requestAi<AiTransactionResult>('/api/classify', {
          text,
          today: selectedDate,
          categories: categories
            .filter((category) => category.id)
            .map((category) => ({
              id: category.id,
              name: category.name,
              spendingType: category.spendingType,
            })),
      })
      const fallback =
        categories.find((category) => category.name === 'ETC')?.id ??
        categories[0]?.id ??
        0

      setDraft({
        date: isValidDateKey(result.date) ? result.date : selectedDate,
        description: cleanDescription(result.description || text, result.merchant || '', result.amount),
        merchant: result.merchant || '',
        amount: result.amount,
        categoryId: categories.some((category) => category.id === result.categoryId)
          ? result.categoryId
          : fallback,
        source: 'ai',
      })
      setAiText('')
    } catch (error) {
      const notice = error instanceof Error ? error.message : 'AI classification failed.'
      const parsed = splitTrailingPrice(text)
      if (parsed) {
        const fallback = categories.find(c => c.name === 'ETC') ?? categories[0]
        if (fallback?.id) setDraft({ date: selectedDate, description: parsed.label, merchant: '', amount: parsed.amount, categoryId: fallback.id, source: 'manual' })
      }
      setAiNotice(notice + (parsed ? ' A manual draft is ready; review the merchant and category before saving.' : ' Your input has been kept.'))
    } finally {
      setAiLoading(false)
    }
  }

  async function importScreenshot(file?: File) {
    if (!file || aiLoading) return

    setAiLoading(true)
    setAiNotice('')
    try {
      const imageDataUrl = await imageFileToDataUrl(file)
      const result = await requestAi<{ transactions: AiTransactionResult[] }>('/api/import-image', {
          imageDataUrl,
          today: selectedDate,
          categories: categories
            .filter((category) => category.id)
            .map((category) => ({
              id: category.id,
              name: category.name,
              spendingType: category.spendingType,
            })),
      })
      if (!result.transactions.length) setAiNotice('No payment rows were found. Crop the image to the payment details and try again.')
      else setReviewItems(result.transactions)
    } catch (error) {
      setAiNotice(error instanceof Error ? error.message : 'Image import failed. Try a clearer image.')
    } finally {
      setAiLoading(false)
      if (imageInputRef.current) imageInputRef.current.value = ''
    }
  }

  const sortedTransactions = [...transactions].sort(
    (a, b) => b.createdAt - a.createdAt,
  )

  return (
    <div className="page-content">
      <section className="daily-hero card">
        <div>
          <div className="eyebrow">SPENT TODAY</div>
          <div className="hero-money">{formatKRW(todayTotal)}</div>
        </div>
        <button
          type="button"
          className="round-add"
          style={{ backgroundColor: theme.primaryBg, color: theme.primaryText }}
          onClick={openManual}
          aria-label="Add expense"
        >
          <Plus size={22} strokeWidth={3} />
        </button>
      </section>

      <section className="card ai-card">
        <div className="card-title-row">
          <div>
            <div className="eyebrow">QUICK INPUT</div>
            <h2>AI Expense</h2>
          </div>
          <Sparkles size={20} style={{ color: theme.primaryBg }} />
        </div>

        <textarea
          value={aiText}
          onChange={(event) => setAiText(event.target.value)}
          placeholder="McDonald's Big Mac meal 8100"
          className="ai-textarea"
          rows={3}  
        />

        <div className="ai-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => imageInputRef.current?.click()}
            disabled={aiLoading}
          >
            <Camera size={18} />
            IMAGE
          </button>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(event) =>
              void importScreenshot(event.target.files?.[0])
            }
          />

          <button
            type="button"
            className="primary-button"
            style={{
              backgroundColor: theme.primaryBg,
              color: theme.primaryText,
            }}
            disabled={aiLoading || !aiText.trim()}
            onClick={() => void classifyText()}
          >
            {aiLoading ? 'READING...' : 'AI ADD'}
          </button>
        </div>
        {aiNotice && <p className="ai-notice" role="status">{aiNotice}</p>}
      </section>

      {budgetCards.length > 0 && (
        <section className="card">
          <div className="section-heading">
            <div>
              <div className="eyebrow">BUDGET CHECK</div>
              <h2>Current Pace</h2>
            </div>
          </div>

          <div className="budget-card-list">
            {budgetCards.map(({ category, spent, ratio }) => (
              <div key={category.id} className="budget-progress-row">
                <div className="budget-progress-head">
                  <div className="category-label">
                    <span
                      className="category-dot"
                      style={{ backgroundColor: category.color }}
                    />
                    <strong>{category.name}</strong>
                    <span className="cycle-chip">
                      {category.budgetCycle.toUpperCase()}
                    </span>
                  </div>
                  <span>
                    {formatKRW(spent)} / {formatKRW(category.budgetAmount)}
                  </span>
                </div>
                <ProgressBar value={ratio} color={category.color} />
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="card">
        <div className="section-heading">
          <div>
            <div className="eyebrow">TODAY</div>
            <h2>Expenses</h2>
          </div>
          <span className="count-badge">{transactions.length}</span>
        </div>

        {sortedTransactions.length === 0 ? (
          <div className="empty-state">No expenses yet</div>
        ) : (
          <div className="transaction-list">
            {sortedTransactions.map((item) => {
              const category =
                categories.find((candidate) => candidate.id === item.categoryId)

              return (
                <button
                  key={item.id}
                  type="button"
                  className="transaction-row"
                  onClick={() => editTransaction(item)}
                >
                  <span
                    className="transaction-accent"
                    style={{
                      backgroundColor: category?.color ?? '#d1d5db',
                    }}
                  />
                  <div className="transaction-copy">
                    <strong>{item.description}</strong>
                    <span>
                      {category?.name ?? 'Deleted Category'}
                      {item.merchant ? ` · ${item.merchant}` : ''}
                    </span>
                  </div>
                  <div className="transaction-amount">
                    {formatKRW(item.amount)}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </section>

      <TransactionModal
        open={Boolean(draft)}
        initial={draft}
        categories={categories}
        theme={theme}
        onClose={() => setDraft(null)}
      />

      {reviewItems && (
        <ImportReviewModal
          items={reviewItems}
          categories={categories}
          theme={theme}
          onClose={() => setReviewItems(null)}
        />
      )}
    </div>
  )
}
