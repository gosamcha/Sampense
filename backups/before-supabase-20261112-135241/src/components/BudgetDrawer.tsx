import { Plus, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { db } from '../db'
import type {
  BudgetCycle,
  Category,
  SpendingType,
  ThemeColors,
} from '../types'
import { formatKRW } from '../utils/money'

type BudgetDrawerProps = {
  categories: Category[]
  theme: ThemeColors
  onClose: () => void
}

const cycleOrder: BudgetCycle[] = ['daily', 'weekly', 'monthly', 'none']

export default function BudgetDrawer({
  categories,
  theme,
  onClose,
}: BudgetDrawerProps) {
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState('#c9c5f4')
  const [budgetCycle, setBudgetCycle] = useState<BudgetCycle>('monthly')
  const [spendingType, setSpendingType] = useState<SpendingType>('variable')
  const [budgetAmount, setBudgetAmount] = useState('')

  async function addCategory() {
    const trimmed = name.trim()
    if (!trimmed) return

    const maxOrder = categories.reduce(
      (max, category) => Math.max(max, category.order),
      -1,
    )

    await db.categories.add({
      name: trimmed,
      color,
      budgetCycle,
      spendingType,
      budgetAmount:
        budgetCycle === 'none' ? 0 : Math.max(0, Number(budgetAmount) || 0),
      order: maxOrder + 1,
    })

    setName('')
    setBudgetAmount('')
    setAdding(false)
  }

  async function deleteCategory(category: Category) {
    if (!category.id) return
    const usedCount = await db.transactions
      .where('categoryId')
      .equals(category.id)
      .count()

    const message =
      usedCount > 0
        ? `This category is used by ${usedCount} transactions. Existing records will be shown as Deleted Category. Delete it anyway?`
        : 'Delete this category?'

    if (!window.confirm(message)) return
    await db.categories.delete(category.id)
  }

  return (
    <div className="drawer-backdrop" onMouseDown={onClose}>
      <aside className="drawer" onMouseDown={(event) => event.stopPropagation()}>
        <div className="drawer-header">
          <div>
            <div className="eyebrow">SAMPENSE</div>
            <h2>Budget & Categories</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose}>
            <X size={22} />
          </button>
        </div>

        <div className="drawer-body">
          <button
            type="button"
            className="primary-button full"
            style={{
              backgroundColor: theme.primaryBg,
              color: theme.primaryText,
            }}
            onClick={() => setAdding((value) => !value)}
          >
            <Plus size={17} strokeWidth={3} />
            CATEGORY
          </button>

          {adding && (
            <section className="drawer-card category-create-card">
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Category name"
                className="text-input"
              />

              <div className="two-column">
                <label className="field">
                  <span>Budget Cycle</span>
                  <select
                    value={budgetCycle}
                    onChange={(event) =>
                      setBudgetCycle(event.target.value as BudgetCycle)
                    }
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="none">None</option>
                  </select>
                </label>

                <label className="field">
                  <span>Spending Type</span>
                  <select
                    value={spendingType}
                    onChange={(event) =>
                      setSpendingType(event.target.value as SpendingType)
                    }
                  >
                    <option value="variable">Variable</option>
                    <option value="fixed">Fixed</option>
                    <option value="planned">Planned</option>
                  </select>
                </label>
              </div>

              <div className="two-column">
                <label className="field">
                  <span>Budget</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    value={budgetAmount}
                    disabled={budgetCycle === 'none'}
                    onChange={(event) => setBudgetAmount(event.target.value)}
                    placeholder="0"
                  />
                </label>

                <label className="field">
                  <span>Color</span>
                  <input
                    type="color"
                    value={color}
                    onChange={(event) => setColor(event.target.value)}
                    className="color-input"
                  />
                </label>
              </div>

              <button
                type="button"
                className="secondary-button full"
                onClick={() => void addCategory()}
              >
                ADD
              </button>
            </section>
          )}

          {cycleOrder.map((cycle) => {
            const items = categories
              .filter((category) => category.budgetCycle === cycle)
              .sort((a, b) => a.order - b.order)

            if (items.length === 0) return null

            return (
              <section key={cycle} className="budget-section">
                <div className="section-label">
                  {cycle === 'none' ? 'NO BUDGET' : `${cycle.toUpperCase()} BUDGET`}
                </div>

                <div className="stack">
                  {items.map((category) => (
                    <CategoryEditor
                      key={category.id}
                      category={category}
                      onDelete={() => void deleteCategory(category)}
                    />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      </aside>
    </div>
  )
}

function CategoryEditor({
  category,
  onDelete,
}: {
  category: Category
  onDelete: () => void
}) {
  if (!category.id) return null

  return (
    <div className="drawer-card category-editor">
      <div className="category-title-row">
        <span
          className="category-dot"
          style={{ backgroundColor: category.color }}
        />
        <input
          value={category.name}
          onChange={(event) =>
            void db.categories.update(category.id!, { name: event.target.value })
          }
          className="category-name-input"
        />
        <button type="button" className="tiny-danger" onClick={onDelete}>
          <Trash2 size={16} />
        </button>
      </div>

      <div className="category-meta">
        <select
          value={category.budgetCycle}
          onChange={(event) => {
            const next = event.target.value as BudgetCycle
            void db.categories.update(category.id!, {
              budgetCycle: next,
              budgetAmount: next === 'none' ? 0 : category.budgetAmount,
            })
          }}
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="none">None</option>
        </select>

        <select
          value={category.spendingType}
          onChange={(event) =>
            void db.categories.update(category.id!, {
              spendingType: event.target.value as SpendingType,
            })
          }
        >
          <option value="variable">Variable</option>
          <option value="fixed">Fixed</option>
          <option value="planned">Planned</option>
        </select>
      </div>

      <div className="category-budget-row">
        <input
          type="number"
          inputMode="numeric"
          min="0"
          disabled={category.budgetCycle === 'none'}
          value={category.budgetAmount}
          onChange={(event) =>
            void db.categories.update(category.id!, {
              budgetAmount: Math.max(0, Number(event.target.value) || 0),
            })
          }
        />
        <span>{formatKRW(category.budgetAmount)}</span>
        <input
          type="color"
          value={category.color}
          onChange={(event) =>
            void db.categories.update(category.id!, {
              color: event.target.value,
            })
          }
          className="color-input compact"
        />
      </div>
    </div>
  )
}
