'use client'

import { useEffect, useRef, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/lib/types'

interface AuthState {
  user: User | null
  profile: Profile | null
  loading: boolean
  signOut: () => Promise<void>
}

async function fetchProfile(supabase: ReturnType<typeof createClient>, userId: string): Promise<Profile | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (error) {
      console.error('[useAuth] profiles query error:', error.message, error.code)
      return null
    }
    return data
  } catch (err) {
    console.error('[useAuth] profiles query threw:', err)
    return null
  }
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const didSetLoading = useRef(false)

  const resolveLoading = () => {
    didSetLoading.current = true
    setLoading(false)
  }

  useEffect(() => {
    // 5-second safety timeout — if auth hasn't resolved, unblock the UI
    const timeout = setTimeout(() => {
      if (!didSetLoading.current) {
        console.warn('[useAuth] 5s timeout reached — forcing loading=false')
        resolveLoading()
      }
    }, 5000)

    const getUser = async () => {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser()
        if (error) console.error('[useAuth] getUser error:', error.message)
        setUser(user ?? null)

        if (user) {
          const profileData = await fetchProfile(supabase, user.id)
          setProfile(profileData)
        }
      } catch (err) {
        console.error('[useAuth] getUser threw:', err)
      } finally {
        resolveLoading()
      }
    }

    getUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null)

      try {
        if (session?.user) {
          const profileData = await fetchProfile(supabase, session.user.id)
          setProfile(profileData)
        } else {
          setProfile(null)
        }
      } catch (err) {
        console.error('[useAuth] onAuthStateChange profile fetch threw:', err)
        setProfile(null)
      } finally {
        resolveLoading()
      }
    })

    return () => {
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const signOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return { user, profile, loading, signOut }
}
