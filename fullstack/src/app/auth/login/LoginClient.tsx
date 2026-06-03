'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { Icon } from '@iconify/react'
import FullLogo from '@/app/(DashboardLayout)/layout/shared/logo/FullLogo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getApiBaseUrl } from '@/lib/api'
import { dashboardPathFor, type LoginResponse, setAuthSession } from '@/lib/auth'

const features = [
  'Kelola assessment manual dan berbantuan AI',
  'Kredit transparan untuk setiap proses AI',
  'Review soal, export PDF, dan monitoring Admin',
]

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
    document.title = 'Masuk | Teachery'
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
    <div className='flex min-h-screen w-full'>
      <div className='relative hidden w-1/2 overflow-hidden bg-primary lg:flex lg:flex-col lg:justify-between'>
        <div className='absolute inset-0 bg-linear-to-br from-primary via-primary to-blue-700 opacity-95' />
        <div className='absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/10 blur-3xl' />
        <div className='absolute -bottom-24 -left-16 h-96 w-96 rounded-full bg-white/10 blur-3xl' />

        <div className='relative z-10 flex flex-col gap-10 p-12 xl:p-16'>
          <div className='[&_img]:brightness-0 [&_img]:invert'>
            <FullLogo />
          </div>

          <div className='max-w-md space-y-4 text-primary-foreground'>
            <h1 className='text-3xl font-bold leading-tight xl:text-4xl'>
              Selamat datang di Teachery
            </h1>
            <p className='text-base text-primary-foreground/85'>
              Assessment Manager untuk guru: buat assessment manual, generate
              soal dengan AI, review, dan export PDF.
            </p>
          </div>

          <ul className='max-w-md space-y-4'>
            {features.map((item) => (
              <li key={item} className='flex items-start gap-3'>
                <span className='mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20'>
                  <Icon
                    icon='solar:check-circle-bold'
                    className='text-white'
                    width={16}
                  />
                </span>
                <span className='text-sm text-primary-foreground/90'>
                  {item}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className='relative z-10 hidden px-12 pb-12 xl:block'>
          <Image
            src='/images/backgrounds/errorimg.svg'
            alt=''
            width={320}
            height={240}
            className='mx-auto opacity-90'
            priority
          />
        </div>
      </div>

      <div className='flex w-full flex-col justify-center bg-background px-6 py-12 sm:px-12 lg:w-1/2 lg:px-16 xl:px-24'>
        <div className='mx-auto w-full max-w-md'>
          <div className='mb-10 lg:hidden'>
            <FullLogo />
          </div>

          <div className='mb-8'>
            <h2 className='text-2xl font-bold text-foreground'>Masuk</h2>
            <p className='mt-2 text-sm text-muted-foreground'>
              Gunakan akun Admin atau Guru dari backend Teachery.
            </p>
          </div>

          <form className='space-y-5' onSubmit={handleSubmit} noValidate>
            <div className='space-y-2'>
              <Label htmlFor='email'>Email</Label>
              <div className='relative'>
                <Icon
                  icon='solar:user-circle-linear'
                  className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground'
                  width={20}
                />
                <Input
                  id='email'
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className='ps-10'
                  autoComplete='email'
                  required
                  disabled={busy}
                />
              </div>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='password'>Password</Label>
              <div className='relative'>
                <Icon
                  icon='solar:lock-keyhole-linear'
                  className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground'
                  width={20}
                />
                <Input
                  id='password'
                  type='password'
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className='ps-10'
                  autoComplete='current-password'
                  required
                  disabled={busy}
                />
              </div>
            </div>

            {error ? (
              <p className='rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive'>
                {error}
              </p>
            ) : null}

            <Button className='w-full' type='submit' disabled={busy}>
              {busy ? 'Memproses...' : 'Masuk'}
            </Button>
          </form>

          <p className='mt-10 text-center text-xs text-muted-foreground lg:text-left'>
            © {new Date().getFullYear()} Teachery
          </p>
        </div>
      </div>
    </div>
  )
}
