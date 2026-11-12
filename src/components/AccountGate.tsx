import { useEffect, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import App from '../App'
import { db, selectAccount, seedInitialData } from '../db'
import { supabase } from '../lib/supabase'
import { signIn, signUp } from '../lib/auth'
import { createSync, downloadSnapshot, initializeAccount, readSnapshot, type SyncState } from '../lib/sync'

export default function AccountGate() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [retry, setRetry] = useState(0)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [syncState, setSyncState] = useState<SyncState>({ message: 'Preparing sync' })
  const engine = useRef<ReturnType<typeof createSync> | null>(null)
  const account = useRef<string | null>(null)
  useEffect(() => {
    if (!supabase) { setLoading(false); return }
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      const id = next?.user.id ?? null
      if (account.current !== id) {
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
    const database = db
    const userId = session.user.id
    setMessage('')
    void (async () => {
      const initialized = await database.syncMeta.get('initialized')
      if (cancelled) return
      if (!initialized) {
        await initializeAccount(database, userId, false)
        if (cancelled) return
        if (!(await database.syncMeta.get('base'))?.value) await seedInitialData()
      }
      if (!cancelled) setReady(true)
    })().catch(e => {
      if (!cancelled) setMessage(e instanceof Error ? e.message : String(e?.message ?? e))
    })
    return () => { cancelled = true }
  }, [session?.user.id, retry])
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
  if (loading) return <div className="account-panel">Checking your session…</div>
  if (!supabase) return <div className="account-panel">Configure Supabase and restart the app.</div>
  if (!session) return <main className="account-panel">
    <h1>Sampense</h1><p>Sign in to access your expenses on any device.</p>
    <form onSubmit={e => { e.preventDefault(); void action(() => signIn(email, password)) }}>
      <label>Email<input type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} /></label>
      <label>Password<input type="password" autoComplete="current-password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} /></label>
      <button disabled={busy} type="submit">Sign in</button>
      <button disabled={busy || !email || password.length < 6} type="button" onClick={() => void action(async () => {
        const data = await signUp(email, password)
        if (!data.session) setMessage('Check your confirmation email, then sign in.')
      })}>Sign up</button>
    </form><p role="status">{message}</p>
  </main>
  if (!ready) return <main className="account-panel">
    <p role="status">{message || 'Loading your expenses…'}</p>
    {message && <button onClick={() => setRetry(value => value + 1)}>Try again</button>}
  </main>
  return <>
    {(syncState.conflict || syncState.error) && <section className="sync-bar" aria-label="Sync notification">
      <span role="status">{syncState.message}</span>
      {syncState.conflict && <button disabled={busy} onClick={() => void action(async () => {
        downloadSnapshot(await readSnapshot(db))
        if (window.confirm('Keep a backup of this device and use the cloud version? Continue?')) await engine.current?.run(true)
      })}>Back up and use cloud version</button>}
      {message && <span role="alert">{message}</span>}
    </section>}<App />
  </>
}
