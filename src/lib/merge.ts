export const stores = ['categories', 'transactions', 'incomes', 'monthlyPlans', 'monthlyMemos', 'merchantRules', 'settings'] as const
export type Store = typeof stores[number]
export type Row = Record<string, unknown>
export type Snapshot = Record<Store, Row[]>
export const keyFields: Record<Store, string> = { categories: 'id', transactions: 'id', incomes: 'id', monthlyPlans: 'id', monthlyMemos: 'month', merchantRules: 'merchantKey', settings: 'key' }
export function emptySnapshot(): Snapshot {
  return { categories: [], transactions: [], incomes: [], monthlyPlans: [], monthlyMemos: [], merchantRules: [], settings: [] }
}
export function equal(a: unknown, b: unknown): boolean {
  return canonical(a) === canonical(b)
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']'
  if (value && typeof value === 'object') return '{' + Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => JSON.stringify(k) + ':' + canonical(v)).join(',') + '}'
  return JSON.stringify(value) ?? 'undefined'
}
export function validateSnapshot(value: unknown): asserts value is Snapshot {
  if (!value || typeof value !== 'object') throw new Error('Invalid backup format.')
  for (const store of stores) {
    const rows = (value as Snapshot)[store]
    if (!Array.isArray(rows)) throw new Error(`Missing data store: ${store}`)
    const keys = new Set()
    for (const row of rows) {
      const key = row?.[keyFields[store]]
      if (!row || !['string', 'number'].includes(typeof key) || keys.has(key)) throw new Error(`Invalid record key: ${store}`)
      if (keyFields[store] === 'id' && (!Number.isSafeInteger(key) || Number(key) <= 0)) throw new Error('Invalid numeric ID')
      keys.add(key)
    }
  }
}
// Missing rows represent deletions. Both sides are compared to the last shared base.
export function mergeSnapshots(base: Snapshot, local: Snapshot, remote: Snapshot) {
  const merged = emptySnapshot()
  const conflicts: string[] = []
  for (const store of stores) {
    const index = (s: Snapshot) => new Map(s[store].map(r => [r[keyFields[store]], r]))
    const b = index(base), l = index(local), r = index(remote)
    for (const key of new Set([...b.keys(), ...l.keys(), ...r.keys()])) {
      const bv = b.get(key), lv = l.get(key), rv = r.get(key)
      let chosen
      if (equal(lv, rv) || equal(rv, bv)) chosen = lv
      else if (equal(lv, bv)) chosen = rv
      else { conflicts.push(`${store}/${String(key)}`); continue }
      if (chosen) merged[store].push(chosen)
    }
    merged[store].sort((a, b) => String(a[keyFields[store]]).localeCompare(String(b[keyFields[store]])))
  }
  // Existing UI deliberately supports historical records whose category was deleted.
  return { merged, conflicts }
}
