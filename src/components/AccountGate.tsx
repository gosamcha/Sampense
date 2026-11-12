import { useEffect, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import App from '../App'
import { db, selectAccount, seedInitialData } from '../db'
import { supabase } from '../lib/supabase'
import { signIn, signOut, signUp } from '../lib/auth'
import { createSync, downloadSnapshot, initializeAccount, readSnapshot, type SyncState } from '../lib/sync'

export default function AccountGate() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [syncState, setSyncState] = useState<SyncState>({ message: '동기화 준비' })
  const engine = useRef<ReturnType<typeof createSync> | null>(null)
  const account = useRef<string | null>(null)
  const generation = useRef(0)
  useEffect(() => {
    if (!supabase) { setLoading(false); return }
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      const id = next?.user.id ?? null
      if (account.current !== id) {
        generation.current++
        engine.current?.stop(); engine.current = null
        setReady(false); setMessage(''); setBusy(false)
        account.current = id
        if (id) selectAccount(id)
      }
      setSession(next); setLoading(false)
    })
    return () => { data.subscription.unsubscribe(); engine.current?.stop() }
  }, [])
  useEffect(() => {
    if (!session) return
    let cancelled = false
    void db.syncMeta.get('initialized').then(async initialized => {
      if (initialized && !cancelled) {
        if (!cancelled) setReady(true)
      }
    }).catch(e => { if (!cancelled) setMessage(String(e)) })
    return () => { cancelled = true }
  }, [session?.user.id])
  useEffect(() => {
    if (!ready || !session) return
    const sync = createSync(db, session.user.id, setSyncState)
    engine.current = sync
    return () => { sync.stop(); if (engine.current === sync) engine.current = null }
  }, [ready, session?.user.id])
  async function action(work: () => Promise<unknown>) {
    setBusy(true); setMessage('')
    try { await work() } catch (e) { setMessage(e instanceof Error ? e.message : String((e as {message?: string})?.message ?? e)) }
    finally { setBusy(false) }
  }
  async function start(migrate: boolean) {
    const id = session!.user.id, current = generation.current
    await initializeAccount(db, id, migrate)
    if (current !== generation.current) return
    if (!(await db.syncMeta.get('base'))?.value) await seedInitialData()
    if (current === generation.current) setReady(true)
  }
  if (loading) return <div className="account-panel">로그인 확인 중…</div>
  if (!supabase) return <div className="account-panel">Supabase 환경 변수를 설정하고 앱을 다시 실행해 주세요.</div>
  if (!session) return <main className="account-panel">
    <h1>Sampense</h1><p>같은 계정으로 PC와 휴대폰의 가계부를 연결하세요.</p>
    <form onSubmit={e => { e.preventDefault(); void action(() => signIn(email, password)) }}>
      <label>이메일<input type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} /></label>
      <label>비밀번호<input type="password" autoComplete="current-password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} /></label>
      <button disabled={busy} type="submit">로그인</button>
      <button disabled={busy || !email || password.length < 6} type="button" onClick={() => void action(async () => {
        const data = await signUp(email, password)
        if (!data.session) setMessage('가입 확인 메일을 확인한 뒤 로그인해 주세요.')
      })}>회원가입</button>
    </form><p role="status">{message}</p>
  </main>
  if (!ready) return <main className="account-panel">
    <h1>가계부 연결</h1><p>{session.user.email}</p>
    <p>기존 기기라면 백업 후 이전을 선택하세요. 원본 IndexedDB는 보관됩니다. 새 기기에서는 클라우드 가계부를 불러오세요.</p>
    <button disabled={busy} onClick={() => void action(() => start(true))}>이 기기 데이터 백업 후 이전</button>
    <button disabled={busy} onClick={() => void action(() => start(false))}>클라우드 가계부 열기 / 새로 시작</button>
    <button disabled={busy} onClick={() => void action(signOut)}>로그아웃</button>
    <p role="status">{message}</p>
  </main>
  return <>
    <section className="sync-bar" aria-label="계정과 동기화">
      <span>{session.user.email}</span><span role="status">{syncState.message}</span>
      <button disabled={busy} onClick={() => void engine.current?.run()}>지금 동기화</button>
      <button disabled={busy} onClick={() => void action(async () => {
        downloadSnapshot(await readSnapshot(db))
        await signOut()
      })}>백업 후 로그아웃</button>
      {syncState.conflict && <button disabled={busy} onClick={() => void action(async () => {
        downloadSnapshot(await readSnapshot(db))
        if (window.confirm('이 기기 버전은 백업으로 보관하고 클라우드 버전을 사용합니다. 계속할까요?')) await engine.current?.run(true)
      })}>충돌: 백업 후 클라우드 버전 사용</button>}
      {message && <span role="alert">{message}</span>}
    </section><App />
  </>
}
