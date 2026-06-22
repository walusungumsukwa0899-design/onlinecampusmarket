import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) console.error('Failed to get session:', error.message)
      setUser(session?.user ?? null)
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
    if (error) throw error
    if (data.user) {
      // Generate a unique referral code for this user
      const myCode = Math.random().toString(36).slice(2, 8).toUpperCase()
      const profileData = { id: data.user.id, full_name: fullName, phone, university, email, referral_code: myCode }
      // If they used a referral code, look it up and credit both users
      if (referralCode?.trim()) {
        const { data: referrer } = await supabase.from('profiles').select('id').eq('referral_code', referralCode.trim().toUpperCase()).maybeSingle()
        if (referrer) {
          profileData.referred_by = referralCode.trim().toUpperCase()
          profileData.credit_balance = 500 // MWK 500 welcome credit
          // Credit the referrer
          await supabase.rpc('add_referral_credit', { referrer_id: referrer.id, amount: 500 })
        }
      }
      const { error: profileError } = await supabase.from('profiles').upsert(profileData)
      if (profileError) console.error('Profile upsert failed:', profileError.message)
    }
    return data
  }

  async function signIn({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
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
      await supabase.from('push_subscriptions').upsert({
        user_id: session.user.id,
        subscription: sub.toJSON(),
      })
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
