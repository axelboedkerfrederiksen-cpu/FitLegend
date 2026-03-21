'use client'

import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/lib/types'

interface AuthState {
  user: User | null
  profile: Profile | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState>({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
})

const supabase = createClient()

async function fetchProfile(userId: string): Promise<Profile | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (error) {
      console.error('[AuthProvider] profiles query error:', error.message, error.code)
      return null
    }
    return data
  } catch (err) {
    console.error('[AuthProvider] profiles query threw:', err)
    return null
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const resolved = useRef(false)

  const resolve = () => {
    resolved.current = true
    setLoading(false)
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!resolved.current) {
        console.warn('[AuthProvider] 5s timeout — forcing loading=false')
        resolve()
      }
    }, 5000)

    const getUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error) console.error('[AuthProvider] getUser error:', error.message)
        setUser(user ?? null)
        if (user) {
          setProfile(await fetchProfile(user.id))
        }
      } catch (err) {
        console.error('[AuthProvider] getUser threw:', err)
      } finally {
        resolve()
      }
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null)
      try {
        if (session?.user) {
          setProfile(await fetchProfile(session.user.id))
        } else {
          setProfile(null)
        }
      } catch (err) {
        console.error('[AuthProvider] onAuthStateChange threw:', err)
        setProfile(null)
      } finally {
        resolve()
      }
    })

    return () => {
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthState {
  return useContext(AuthContext)
}
