'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

export default function Home() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.replace('/login')
      return
    }
    if (user.role_name === 'ADMIN') {
      router.replace('/dashboard')
    } else {
      router.replace('/attorney')
    }
  }, [user, loading, router])

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="animate-pulse text-gray-400 text-sm">Loading...</div>
    </div>
  )
}
