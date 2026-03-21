'use client'

import { useAuth } from '@/components/AuthProvider'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function MeProfilePage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (user) {
      router.replace(`/profile/${user.id}`)
    } else {
      router.replace('/login')
    }
  }, [user, loading, router])

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: '#0a0a0f' }}
    >
      <div
        className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: '#ff5a32', borderTopColor: 'transparent' }}
      />
    </div>
  )
}
