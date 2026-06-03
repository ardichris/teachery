'use client'

import { useEffect, useState } from 'react'
import { apiJson } from '@/lib/teachery-api'

type AdminDashboard = {
  total_users: number
  active_teachers: number
  total_credit_balance: number
  jobs_today: number
  failed_jobs_today: number
  credits_used_today: number
}

export default function AdminDashboardPage() {
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    apiJson<AdminDashboard>('/admin/dashboard')
      .then((res) => setDashboard(res.data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Gagal memuat dashboard.'))
  }, [])

  const stats = [
    ['Total User', dashboard?.total_users],
    ['Guru Aktif', dashboard?.active_teachers],
    ['Total Kredit', dashboard?.total_credit_balance],
    ['Job Hari Ini', dashboard?.jobs_today],
    ['Job Gagal', dashboard?.failed_jobs_today],
    ['Kredit AI Hari Ini', dashboard?.credits_used_today],
  ]

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-2xl font-semibold'>Dashboard Admin</h1>
        <p className='mt-1 text-sm text-muted-foreground'>
          Ringkasan operasional user, Kredit, job, dan audit Teachery.
        </p>
      </div>
      {error ? <p className='rounded-md bg-destructive/10 p-3 text-sm text-destructive'>{error}</p> : null}
      <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
        {stats.map(([label, value]) => (
          <div className='rounded-lg border bg-card p-5 shadow-sm' key={label}>
            <p className='text-sm font-medium text-muted-foreground'>{label}</p>
            <p className='mt-3 text-3xl font-bold'>{value ?? '-'}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
