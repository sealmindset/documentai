'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Shield, LogIn } from 'lucide-react'

const ERROR_MESSAGES: Record<string, string> = {
  oidc_unavailable: 'Login service is unavailable. Please try again.',
  oidc_denied: 'Login was cancelled or denied.',
  no_code: 'Login failed. Please try again.',
  auth_failed: 'Authentication failed. Please try again.',
}

function LoginContent() {
  const searchParams = useSearchParams()
  const [checking, setChecking] = useState(true)

  const errorCode = searchParams.get('error')
  const error = errorCode && ERROR_MESSAGES[errorCode] ? ERROR_MESSAGES[errorCode] : ''

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => {
        if (res.ok) {
          window.location.href = '/dashboard'
        } else {
          setChecking(false)
        }
      })
      .catch(() => setChecking(false))
  }, [])

  const handleLogin = () => {
    window.location.href = '/api/auth/login'
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-blue-100">
              <Shield className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <CardTitle className="text-2xl">Document AI Platform</CardTitle>
          <CardDescription>
            Legal Document Intelligence for Vanmerven Law Firm
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
              {error}
            </div>
          )}

          <Button onClick={handleLogin} className="w-full" size="lg">
            <LogIn className="h-4 w-4 mr-2" />
            Sign in with SSO
          </Button>

          <p className="text-xs text-gray-500 text-center mt-6">
            Protected by VLF Information Security
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <div className="text-gray-500">Loading...</div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  )
}
