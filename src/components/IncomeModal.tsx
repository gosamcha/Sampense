import { Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { db } from '../db'
import type { Income, ThemeColors } from '../types'

type IncomeModalProps = {
  initial: Income | null
  defaultDate: string
  theme: ThemeColors
  onClose: () => void
}

export default function IncomeModal({
  initial,
  defaultDate,
  theme,
  onClose,
}: IncomeModalProps) {
  const [date, setDate] = useState(initial?.date ?? defaultDate)
  const [description, setDescription] = useState(initial?.description ?? '')
  const [amount, setAmount] = useState(initial?.amount ?? 0)

  useEffect(() => {
    setDate(initial?.date ?? defaultDate)
    setDescription(initial?.description ?? '')
    setAmount(initial?.amount ?? 0)
  }, [initial, defaultDate])

  async function save() {
    const text = description.trim()
    if (!text || amount <= 0) return

    if (initial?.id) {
      await db.incomes.update(initial.id, {
        date,
        description: text,
        amount: Math.round(amount),
      })
    } else {
      await db.incomes.add({
        date,
        description: text,
        amount: Math.round(amount),
        createdAt: Date.now(),
      })
    }

    onClose()
  }

  async function remove() {
    if (!initial?.id) return
    if (!window.confirm('Delete this income?')) return
    await db.incomes.delete(initial.id)
    onClose()
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal-card" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="eyebrow">MONTHLY INCOME</div>
            <h2>{initial ? 'Edit Income' : 'Add Income'}</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose}>
            <X size={21} />
          </button>
        </div>

        <div className="modal-fields">
          <label className="field">
            <span>Date</span>
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </label>
          <label className="field">
            <span>Income</span>
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Salary"
            />
          </label>
          <label className="field">
            <span>Amount</span>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              value={amount || ''}
              onChange={(event) => setAmount(Number(event.target.value))}
            />
          </label>
        </div>

        <div className="modal-actions">
          {initial?.id ? (
            <button type="button" className="danger-icon-button" onClick={() => void remove()}>
              <Trash2 size={19} />
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            className="primary-button"
            style={{ backgroundColor: theme.primaryBg, color: theme.primaryText }}
            onClick={() => void save()}
          >
            SAVE
          </button>
        </div>
      </div>
    </div>
  )
}
