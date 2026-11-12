import { client } from './supabase'
import { validateSnapshot, type Snapshot } from './merge'
export type CloudSnapshot = { revision: string; data: Snapshot }
const store = '__ledger__'
const key = 'v1'
export async function loadRecords(userId: string): Promise<CloudSnapshot | null> {
  const { data, error } = await client().from('app_records').select('payload')
    .eq('user_id', userId).eq('store_name', store).eq('record_key', key).maybeSingle()
  if (error) throw error
  if (!data) return null
  const payload = data.payload as CloudSnapshot
  if (typeof payload?.revision !== 'string') throw new Error('Unsupported cloud data format.')
  validateSnapshot(payload.data)
  return payload
}
// Compare-and-swap: a stale device can never silently overwrite a newer snapshot.
export async function saveRecord(userId: string, data: Snapshot, previous: string | null) {
  const payload: CloudSnapshot = { revision: crypto.randomUUID(), data }
  const row = { user_id: userId, store_name: store, record_key: key, payload,
    updated_at: new Date().toISOString(), deleted_at: null }
  const query = previous === null
    ? client().from('app_records').insert(row)
    : client().from('app_records').update(row).eq('user_id', userId)
      .eq('store_name', store).eq('record_key', key).eq('payload->>revision', previous)
  const result = await query.select('record_key')
  if (result.error?.code === '23505') return null
  if (result.error) throw result.error
  return result.data?.length === 1 ? payload : null
}
