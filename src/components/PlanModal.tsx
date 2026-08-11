import { Trash2, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { db } from '../db'
import type {
  Category,
  MonthlyPlan,
  PlanKind,
  PlanStatus,
  ThemeColors,
} from '../types'

type PlanModalProps = {
  initial: MonthlyPlan | null
  defaultDate: string
  categories: Category[]
  theme: ThemeColors
  onClose: () => void
}

export default function PlanModal({
  initial,
  defaultDate,
  categories,
  theme,
  onClose,
}: PlanModalProps) {
  const defaultCategory = useMemo(
    () =>
      categories.find((category) => category.spendingType !== 'variable')?.id ??
      categories[0]?.id ??
      0,
    [categories],
  )

  const [date, setDate] = useState(initial?.date ?? defaultDate)
  const [description, setDescription] = useState(initial?.description ?? '')
  const [amount, setAmount] = useState(initial?.amount ?? 0)
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? defaultCategory)
  const [kind, setKind] = useState<PlanKind>(initial?.kind ?? 'planned')
  const [status, setStatus] = useState<PlanStatus>(initial?.status ?? 'planned')

  async function save() {
    const text = description.trim()
    if (!text || amount <= 0 || !categoryId) return

    const patch = {
      date,
      description: text,
      amount: Math.round(amount),
      categoryId,
      kind,
      status,
    }

    if (initial?.id) {
      await db.monthlyPlans.update(initial.id, patch)
    } else {
      await db.monthlyPlans.add({
        ...patch,
        createdAt: Date.now(),
      })
    }

    onClose()
  }

  async function remove() {
    if (!initial?.id) return
    if (!window.confirm('Delete this plan?')) return
    await db.monthlyPlans.delete(initial.id)
    onClose()
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal-card" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="eyebrow">FIXED & PLANNED</div>
            <h2>{initial ? 'Edit Item' : 'Add Item'}</h2>
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
            <span>Item</span>
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Concert ticket"
            />
          </label>

          <div className="two-column">
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

            <label className="field">
              <span>Category</span>
              <select
                value={categoryId}
                onChange={(event) => setCategoryId(Number(event.target.value))}
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="two-column">
            <label className="field">
              <span>Type</span>
              <select value={kind} onChange={(event) => setKind(event.target.value as PlanKind)}>
                <option value="fixed">Fixed</option>
                <option value="planned">Planned</option>
              </select>
            </label>

            <label className="field">
              <span>Status</span>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as PlanStatus)}
              >
                <option value="planned">Planned</option>
                <option value="paid">Paid</option>
              </select>
            </label>
          </div>
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
