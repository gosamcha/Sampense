import { SampenseDB } from '../db'
import { emptySnapshot, equal, keyFields, mergeSnapshots, stores, validateSnapshot, type Snapshot } from './merge'
import { loadRecords, saveRecord, type CloudSnapshot } from './records'

export async function readSnapshot(database: SampenseDB): Promise<Snapshot> {
  return database.transaction('r', stores.map(s => database.table(s)), async () => {
    const result = emptySnapshot()
    for (const s of stores) result[s] = (await database.table(s).toArray()).sort((a, b) => String(a[keyFields[s]]).localeCompare(String(b[keyFields[s]])))
    return result
  })
}
async function writeSnapshot(database: SampenseDB, data: Snapshot) {
  validateSnapshot(data)
  for (const s of stores) {
    await database.table(s).clear()
    await database.table(s).bulkPut(data[s])
  }
}
export function downloadSnapshot(data: Snapshot) {
  const url = URL.createObjectURL(new Blob([JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), ...data }, null, 2)], { type: 'application/json' }))
  const a = document.createElement('a'); a.href = url
  a.download = `sampense-backup-${Date.now()}.json`; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
export async function initializeAccount(database: SampenseDB, userId: string, migrate: boolean) {
  if (await database.syncMeta.get('initialized')) return
  const remote = await loadRecords(userId)
  let initial = remote?.data ?? emptySnapshot()
  if (migrate) {
    if (remote) throw new Error('이 계정에는 클라우드 데이터가 있습니다. 기존 기기 백업을 보관한 후 클라우드 데이터로 시작해 주세요.')
    const legacy = new SampenseDB()
    try { initial = await readSnapshot(legacy); downloadSnapshot(initial) } finally { legacy.close() }
  }
  await database.transaction('rw', database.tables, async () => {
    if (await database.syncMeta.get('initialized')) return
    await writeSnapshot(database, initial)
    await database.syncMeta.put({ key: 'base', value: remote })
    await database.syncMeta.put({ key: 'initialized', value: true })
    if (migrate) await database.syncMeta.put({ key: `backup-${Date.now()}`, value: initial })
  })
}
export type SyncState = { message: string; conflict?: boolean; error?: boolean }
export function createSync(database: SampenseDB, userId: string, report: (s: SyncState) => void) {
  let stopped = false
  let busy = false
  async function run(useCloud = false) {
    if (stopped || busy) return
    busy = true
    try {
      await navigator.locks.request(`sampense-sync-${userId}`, async () => {
        if (stopped) return
        const local = await readSnapshot(database)
        const base = (await database.syncMeta.get('base'))?.value as CloudSnapshot | null
        const remote = await loadRecords(userId)
        if (stopped) return
        if (!remote && base) throw new Error('클라우드 가계부가 삭제되었습니다. 자동 재업로드를 중단했습니다.')
        const result = mergeSnapshots(base?.data ?? emptySnapshot(), local, remote?.data ?? emptySnapshot())
        if (result.conflicts.length && !useCloud) {
          report({ message: `동시 수정 충돌 ${result.conflicts.length}건. 이 기기 백업을 받은 뒤 클라우드 버전을 선택할 수 있습니다.`, conflict: true }); return
        }
        const merged = useCloud ? remote?.data ?? emptySnapshot() : result.merged
        const saved = remote && equal(merged, remote.data) ? remote : await saveRecord(userId, merged, remote?.revision ?? null)
        if (!saved || stopped) { if (!stopped) report({ message: '다른 기기의 저장을 감지했습니다. 다시 동기화합니다.' }); return }
        await database.transaction('rw', database.tables, async () => {
          // Edits made while the request was in flight remain pending for the next pass.
          const current = await readSnapshot(database)
          const rebased = mergeSnapshots(local, current, saved.data)
          if (equal(current, local) || (!useCloud && rebased.conflicts.length === 0)) {
            if (useCloud) await database.syncMeta.put({ key: `backup-${Date.now()}`, value: local })
            await writeSnapshot(database, equal(current, local) ? saved.data : rebased.merged)
            await database.syncMeta.put({ key: 'base', value: saved })
          }
        })
        report({ message: `동기화 확인 ${new Date().toLocaleTimeString()}` })
      })
    } catch (error) {
      if (!stopped) report({ error: true, message: `기기에 저장됨 · 동기화 대기: ${error instanceof Error ? error.message : String((error as {message?: string})?.message ?? error)}` })
    } finally { busy = false }
  }
  const timer = window.setInterval(() => void run(), 5000)
  const wake = () => void run()
  window.addEventListener('online', wake); window.addEventListener('focus', wake)
  void run()
  return {
    run,
    stop() { stopped = true; clearInterval(timer); window.removeEventListener('online', wake); window.removeEventListener('focus', wake) },
  }
}
