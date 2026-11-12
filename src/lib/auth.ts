import { client } from './supabase'
export async function signUp(email: string, password: string) {
  const { data, error } = await client().auth.signUp({ email, password,
    options: { emailRedirectTo: window.location.origin } })
  if (error) throw error
  return data
}
export async function signIn(email: string, password: string) {
  const { data, error } = await client().auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}
export async function signOut() {
  const { error } = await client().auth.signOut({ scope: 'local' })
  if (error) throw error
}
export async function getCurrentUser() {
  const { data, error } = await client().auth.getUser()
  if (error) throw error
  return data.user
}
