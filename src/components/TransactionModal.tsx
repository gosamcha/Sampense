import { Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { db } from '../db'
import type {
  Category,
  ThemeColors,
  Transaction,
  TransactionDraft,
} from '../types'
import { normalizeMerchant } from '../utils/money'

type TransactionModalProps = {
  open: boolean
  initial: TransactionDraft | null
  categories: Category[]
  theme: ThemeColors
  onClose: () => void
}

export default function TransactionModal({
  open,
  initial,
  categories,
  theme,
  onClose,
}: TransactionModalProps) {
  const fallbackCategoryId = useMemo(
    () => categories.find((category) => category.name === 'ETC')?.id ?? categories[0]?.id ?? 0,
    [categories],
  )

  const [draft, setDraft] = useState<TransactionDraft | null>(initial)

  useEffect(() => {
    setDraft(initial)
  }, [initial])

  if (!open || !draft) return null

  async function save() {
    if (!draft) return

    const currentDraft = draft

    const description = draft.description.trim()
    const amount = Math.round(Number(draft.amount))
    const categoryId = draft.categoryId || fallbackCategoryId

    if (!description || !amount || amount <= 0 || !categoryId) return

    const payload: Omit<Transaction, 'id'> = {
      date: draft.date,
      description,
      merchant: draft.merchant.trim() || undefined,
      amount,
      categoryId,
      source: draft.source,
      createdAt: Date.now(),
    }

    if (currentDraft.id) {
      const old = await db.transactions.get(currentDraft.id)
      await db.transactions.update(currentDraft.id, {
        ...payload,
        createdAt: old?.createdAt ?? payload.createdAt,
      })
    } else {
      await db.transactions.add(payload)
    }

    const merchantKey = normalizeMerchant(draft.merchant)
    if (merchantKey) {
      await db.merchantRules.put({
        merchantKey,
        categoryId,
        updatedAt: Date.now(),
      })
    }

    onClose()
  }

  async function remove() {
    if (!draft) return

    const currentDraft = draft

    if (!currentDraft.id) {
      onClose()
      return
    }
    if (!window.confirm('Delete this transaction?')) return
    await db.transactions.delete(currentDraft.id)
    onClose()
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal-card" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="eyebrow">
              {draft.source === 'ai'
                ? 'AI RESULT'
                : draft.source === 'screenshot'
                  ? 'SCREENSHOT'
                  : 'TRANSACTION'}
            </div>
            <h2>{draft.id ? 'Edit Expense' : 'Add Expense'}</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose}>
            <X size={21} />
          </button>
        </div>

        <div className="modal-fields">
          <label className="field">
            <span>Date</span>
            <input
              type="date"
              value={draft.date}
              onChange={(event) =>
                setDraft({ ...draft, date: event.target.value })
              }
            />
          </label>

          <label className="field">
            <span>Expense</span>
            <input
              value={draft.description}
              onChange={(event) =>
                setDraft({ ...draft, description: event.target.value })
              }
              placeholder="Lunch"
            />
          </label>

          <label className="field">
            <span>Merchant</span>
            <input
              value={draft.merchant}
              onChange={(event) =>
                setDraft({ ...draft, merchant: event.target.value })
              }
              placeholder="Merchant name"
            />
          </label>

          <div className="two-column">
            <label className="field">
              <span>Amount</span>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={draft.amount || ''}
                onChange={(event) =>
                  setDraft({ ...draft, amount: Number(event.target.value) })
                }
                placeholder="0"
              />
            </label>

            <label className="field">
              <span>Category</span>
              <select
                value={draft.categoryId || fallbackCategoryId}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    categoryId: Number(event.target.value),
                  })
                }
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="modal-note">
            Changing a merchant's category teaches Sampense to reuse that choice
            next time.
          </div>
        </div>

        <div className="modal-actions">
          {draft.id ? (
            <button type="button" className="danger-icon-button" onClick={() => void remove()}>
              <Trash2 size={19} />
            </button>
          ) : (
            <span />
          )}

          <button
            type="button"
            className="primary-button"
            style={{
              backgroundColor: theme.primaryBg,
              color: theme.primaryText,
            }}
            onClick={() => void save()}
          >
            SAVE
          </button>
        </div>
      </div>
    </div>
  )
}
