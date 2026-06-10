'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getApiBaseUrl } from '@/lib/api'
import { dashboardPathFor, type LoginResponse, setAuthSession } from '@/lib/auth'

export default function LoginClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const redirectTo =
    searchParams.get('from') && searchParams.get('from') !== '/auth/login'
      ? searchParams.get('from')!
      : ''

  useEffect(() => {
    document.title = 'Login | Teachery'
  }, [])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')

    const apiUrl = getApiBaseUrl()

    try {
      const res = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const payload = (await res.json().catch(() => ({}))) as {
        data?: LoginResponse
        error?: { message?: string }
      }

      if (!res.ok) {
        throw new Error(
          payload.error?.message ?? 'Gagal login. Periksa email dan password.'
        )
      }
      if (!payload.data) {
        throw new Error('Response login tidak valid.')
      }

      setAuthSession(payload.data)
      router.replace(redirectTo || dashboardPathFor(payload.data.user.role))
    } catch (err) {
      if (
        err instanceof TypeError &&
        (err.message === 'Failed to fetch' ||
          err.message.includes('NetworkError'))
      ) {
        setError(
          `Tidak dapat terhubung ke backend (${apiUrl}). Pastikan server Go berjalan di port 8080.`
        )
      } else {
        setError(err instanceof Error ? err.message : 'Gagal login.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className='flex h-dvh'>
      <div className='hidden bg-primary lg:block lg:w-1/3'>
        <div className='flex h-full flex-col items-center justify-center p-12 text-center'>
          <div className='space-y-6'>
            <div className='mx-auto flex size-20 items-center justify-center rounded-2xl bg-white p-2 shadow-lg'>
              <img src='/teachery.svg' alt='Teachery' className='h-full w-full object-contain' />
            </div>
            <div className='space-y-2'>
              <h1 className='text-5xl font-light text-primary-foreground'>
                Hello again
              </h1>
              <p className='text-xl text-primary-foreground/80'>
                Login to continue
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className='flex w-full items-center justify-center bg-background p-8 lg:w-2/3'>
        <div className='w-full max-w-md space-y-10 py-24 lg:py-32'>
          <div className='space-y-4 text-center'>
            <div className='font-medium tracking-tight'>Login</div>
            <div className='mx-auto max-w-xl text-muted-foreground'>
              Welcome back. Enter your email and password to open Teachery.
            </div>
          </div>

          <form className='flex flex-col gap-4' onSubmit={handleSubmit} noValidate>
            <div className='space-y-1.5'>
              <Label htmlFor='login-email'>Email Address</Label>
              <Input
                id='login-email'
                type='email'
                placeholder='you@example.com'
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete='email'
                required
                disabled={busy}
              />
            </div>

            <div className='space-y-1.5'>
              <Label htmlFor='login-password'>Password</Label>
              <Input
                id='login-password'
                type='password'
                placeholder='********'
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete='current-password'
                required
                disabled={busy}
              />
            </div>

            {error ? (
              <p className='rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive'>
                {error}
              </p>
            ) : null}

            <Button className='w-full' type='submit' disabled={busy}>
              {busy ? 'Memproses...' : 'Login'}
            </Button>
          </form>

          <p className='text-center text-xs text-muted-foreground'>
            Back to{' '}
            <Link className='text-primary' href='/'>
              landing page
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
