import { X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { db } from '../db'
import type {
  AiTransactionResult,
  Category,
  ThemeColors,
} from '../types'
import { formatKRW, normalizeMerchant } from '../utils/money'

type ReviewRow = AiTransactionResult & {
  key: string
  selected: boolean
}

type ImportReviewModalProps = {
  items: AiTransactionResult[]
  categories: Category[]
  theme: ThemeColors
  onClose: () => void
}

export default function ImportReviewModal({
  items,
  categories,
  theme,
  onClose,
}: ImportReviewModalProps) {
  const fallbackCategoryId = useMemo(
    () => categories.find((category) => category.name === 'ETC')?.id ?? categories[0]?.id ?? 0,
    [categories],
  )

  const [rows, setRows] = useState<ReviewRow[]>(
    items.map((item, index) => ({
      ...item,
      categoryId:
        categories.some((category) => category.id === item.categoryId)
          ? item.categoryId
          : fallbackCategoryId,
      key: `${item.date}-${item.amount}-${index}`,
      selected: true,
    })),
  )

  const selectedCount = rows.filter((row) => row.selected).length

  async function saveAll() {
    const selected = rows.filter(
      (row) => row.selected && row.amount > 0 && row.description.trim(),
    )

    if (selected.length === 0) return

    await db.transaction('rw', db.transactions, db.merchantRules, async () => {
      for (const row of selected) {
        const categoryId = row.categoryId || fallbackCategoryId
        await db.transactions.add({
          date: row.date,
          description: row.description.trim(),
          merchant: row.merchant.trim() || undefined,
          amount: Math.round(row.amount),
          categoryId,
          source: 'screenshot',
          createdAt: Date.now(),
        })

        const merchantKey = normalizeMerchant(row.merchant)
        if (merchantKey) {
          await db.merchantRules.put({
            merchantKey,
            categoryId,
            updatedAt: Date.now(),
          })
        }
      }
    })

    onClose()
  }

  function patch(index: number, change: Partial<ReviewRow>) {
    setRows((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...change } : row,
      ),
    )
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        className="modal-card review-modal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <div className="eyebrow">AI IMPORT</div>
            <h2>Review Transactions</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose}>
            <X size={21} />
          </button>
        </div>

        <div className="review-list">
          {rows.map((row, index) => (
            <div
              key={row.key}
              className={`review-row ${row.selected ? '' : 'disabled'}`}
            >
              <input
                type="checkbox"
                checked={row.selected}
                onChange={(event) => patch(index, { selected: event.target.checked })}
              />

              <div className="review-main">
                <input
                  className="review-description"
                  value={row.description}
                  onChange={(event) => patch(index, { description: event.target.value })}
                />

                <div className="review-meta-grid">
                  <input
                    type="date"
                    value={row.date}
                    onChange={(event) => patch(index, { date: event.target.value })}
                  />
                  <select
                    value={row.categoryId}
                    onChange={(event) =>
                      patch(index, { categoryId: Number(event.target.value) })
                    }
                  >
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="review-bottom">
                  <input
                    value={row.merchant}
                    onChange={(event) => patch(index, { merchant: event.target.value })}
                    placeholder="Merchant"
                  />
                  <input
                    type="number"
                    inputMode="numeric"
                    value={row.amount}
                    onChange={(event) => patch(index, { amount: Number(event.target.value) })}
                  />
                </div>

                <div className="review-money">{formatKRW(row.amount)}</div>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          className="primary-button full"
          style={{ backgroundColor: theme.primaryBg, color: theme.primaryText }}
          onClick={() => void saveAll()}
        >
          IMPORT {selectedCount}
        </button>
      </div>
    </div>
  )
}
