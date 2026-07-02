import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'

const AuthContext = createContext(null)

// Safely extract a readable message from any Supabase error
function extractError(error) {
  if (!error) return 'Something went wrong. Please try again.'
  if (typeof error === 'string') return error
  return error.message || error.error_description || error.msg || JSON.stringify(error) || 'Something went wrong. Please try again.'
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Timeout fallback: if getSession hangs (bad network/env vars), stop loading after 5s
    const sessionTimeout = setTimeout(() => {
      console.warn('Wolf Marketplace: getSession timed out — showing app without auth')
      setLoading(false)
    }, 5000)

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      clearTimeout(sessionTimeout)
      if (error) console.error('Failed to get session:', extractError(error))
      setUser(session?.user ?? null)
      setLoading(false)
    }).catch((err) => {
      clearTimeout(sessionTimeout)
      console.error('getSession threw:', err)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function signUp({ email, password, fullName, phone, university, referralCode }) {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName, phone, university } }
    })
    if (error) throw new Error(extractError(error))
    if (data.user) {
      const myCode = Math.random().toString(36).slice(2, 8).toUpperCase()
      const profileData = { id: data.user.id, full_name: fullName, phone, university, email, referral_code: myCode }
      if (referralCode?.trim()) {
        const { data: referrer } = await supabase.from('profiles').select('id').eq('referral_code', referralCode.trim().toUpperCase()).maybeSingle()
        if (referrer) {
          profileData.referred_by = referralCode.trim().toUpperCase()
          profileData.credit_balance = 500
          await supabase.rpc('add_referral_credit', { referrer_id: referrer.id, amount: 500 })
        }
      }
      const { error: profileError } = await supabase.from('profiles').upsert(profileData)
      if (profileError) console.error('Profile upsert failed:', extractError(profileError))
    }
    return data
  }

  async function signIn({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(extractError(error))
    return data
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  async function registerPush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    try {
      const reg = await navigator.serviceWorker.ready
      const existing = await reg.pushManager.getSubscription()
      const sub = existing || await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: import.meta.env.VITE_VAPID_PUBLIC_KEY,
      })
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const subJson = sub.toJSON()
      await supabase.from('push_subscriptions').upsert({
        user_id: session.user.id,
        subscription: subJson,
      }, { onConflict: 'user_id,endpoint' })
    } catch (err) {
      console.warn('Push registration failed:', err)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut, registerPush }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() { return useContext(AuthContext) }
