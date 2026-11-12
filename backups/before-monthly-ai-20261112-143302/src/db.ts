import Dexie, { type Table } from 'dexie'
import type {
  AppSetting,
  Category,
  Income,
  MerchantRule,
  MonthlyMemo,
  MonthlyPlan,
  Transaction,
} from './types'
import { DEFAULT_THEME, THEME_KEYS } from './theme'

export class SampenseDB extends Dexie {
  syncMeta!: Table<{ key: string; value: unknown }, string>
  categories!: Table<Category, number>
  transactions!: Table<Transaction, number>
  incomes!: Table<Income, number>
  monthlyPlans!: Table<MonthlyPlan, number>
  monthlyMemos!: Table<MonthlyMemo, string>
  merchantRules!: Table<MerchantRule, string>
  settings!: Table<AppSetting, string>

  constructor(name = 'SampenseDB') {
    super(name)

    this.version(1).stores({
      categories: '++id,name,budgetCycle,spendingType,order',
      transactions: '++id,date,categoryId,merchant,createdAt',
      incomes: '++id,date,createdAt',
      monthlyPlans: '++id,date,categoryId,kind,status,createdAt',
      merchantRules: 'merchantKey,categoryId,updatedAt',
      settings: 'key',
    })

    this.version(2).stores({
      categories: '++id,name,budgetCycle,spendingType,order',
      transactions: '++id,date,categoryId,merchant,createdAt',
      incomes: '++id,date,createdAt',
      monthlyPlans: '++id,date,categoryId,kind,status,createdAt',
      monthlyMemos: 'month,updatedAt',
      merchantRules: 'merchantKey,categoryId,updatedAt',
      settings: 'key',
    })
    this.version(3).stores({ syncMeta: 'key' })
    // Preserve old IDs, but allocate new records independently on each device.
    for (const name of ['categories', 'transactions', 'incomes', 'monthlyPlans']) {
      this.table(name).hook('creating', (key, object) => {
        if (key !== undefined) return
        const random = crypto.getRandomValues(new Uint32Array(2))
        const id = (random[0] & 0x1fffff) * 0x100000000 + random[1]
        object.id = id || 1
        return object.id
      })
    }
  }
}

export let db = new SampenseDB()
export function selectAccount(userId: string) {
  db.close()
  db = new SampenseDB(`SampenseDB-account-${userId}`)
  return db
}

const DEFAULT_CATEGORIES: Category[] = [
  {
    name: 'Food',
    color: '#efb9aa',
    budgetCycle: 'weekly',
    budgetAmount: 90000,
    spendingType: 'variable',
    order: 0,
  },
  {
    name: 'Cafe',
    color: '#d2c0ef',
    budgetCycle: 'weekly',
    budgetAmount: 30000,
    spendingType: 'variable',
    order: 1,
  },
  {
    name: 'Transport',
    color: '#a9cbed',
    budgetCycle: 'monthly',
    budgetAmount: 80000,
    spendingType: 'variable',
    order: 2,
  },
  {
    name: 'Shopping',
    color: '#efd99f',
    budgetCycle: 'monthly',
    budgetAmount: 100000,
    spendingType: 'variable',
    order: 3,
  },
  {
    name: 'Subscription',
    color: '#b9d8c2',
    budgetCycle: 'monthly',
    budgetAmount: 50000,
    spendingType: 'fixed',
    order: 4,
  },
  {
    name: 'Culture',
    color: '#efbed2',
    budgetCycle: 'monthly',
    budgetAmount: 200000,
    spendingType: 'planned',
    order: 5,
  },
  {
    name: 'ETC',
    color: '#d1d5db',
    budgetCycle: 'none',
    budgetAmount: 0,
    spendingType: 'variable',
    order: 6,
  },
]

export async function seedInitialData() {
  await db.transaction('rw', db.categories, db.settings, async () => {
    if ((await db.categories.count()) === 0) {
      await db.categories.bulkAdd(DEFAULT_CATEGORIES)
    }

    const settings = [
      [THEME_KEYS.primaryBg, DEFAULT_THEME.primaryBg],
      [THEME_KEYS.primaryText, DEFAULT_THEME.primaryText],
      [THEME_KEYS.income, DEFAULT_THEME.income],
      [THEME_KEYS.expense, DEFAULT_THEME.expense],
    ] as const

    for (const [key, value] of settings) {
      if (!(await db.settings.get(key))) {
        await db.settings.put({ key, value })
      }
    }
  })
}

export async function exportAllData() {
  const [categories, transactions, incomes, monthlyPlans, monthlyMemos, merchantRules, settings] =
    await Promise.all([
      db.categories.toArray(),
      db.transactions.toArray(),
      db.incomes.toArray(),
      db.monthlyPlans.toArray(),
      db.monthlyMemos.toArray(),
      db.merchantRules.toArray(),
      db.settings.toArray(),
    ])

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    categories,
    transactions,
    incomes,
    monthlyPlans,
    monthlyMemos,
    merchantRules,
    settings,
  }
}

export async function clearAllData() {
  await db.transaction(
    'rw',
    [
      db.categories,
      db.transactions,
      db.incomes,
      db.monthlyPlans,
      db.monthlyMemos,
      db.merchantRules,
      db.settings,
    ],
    async () => {
      await Promise.all([
        db.categories.clear(),
        db.transactions.clear(),
        db.incomes.clear(),
        db.monthlyPlans.clear(),
        db.monthlyMemos.clear(),
        db.merchantRules.clear(),
        db.settings.clear(),
      ])
    },
  )

  await seedInitialData()
}
