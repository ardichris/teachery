'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { apiJson } from '@/lib/teachery-api'

type Assessment = {
  id: string
  title: string
  subject: string
  grade: string
  status: string
  updated_at: string
}

function displayStatus(status: string) {
  return status === 'published' || status === 'ready_to_export' || status === 'pdf_ready'
    ? 'Published'
    : 'Draft'
}

function formatDateTime(value: string) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(value))
}

export default function SubmissionsPage() {
  const [items, setItems] = useState<Assessment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true

    async function loadAssessments() {
      setLoading(true)
      setError('')

      try {
        const res = await apiJson<Assessment[]>('/assessments')
        if (!alive) return
        setItems(res.data)
      } catch (err) {
        if (!alive) return
        setError(err instanceof Error ? err.message : 'Gagal memuat assessment.')
      } finally {
        if (alive) setLoading(false)
      }
    }

    void loadAssessments()

    return () => {
      alive = false
    }
  }, [])

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-2xl font-semibold text-foreground'>Submission</h1>
        <p className='mt-1 text-sm text-muted-foreground'>
          Pilih assessment untuk mereview jawaban yang dikirim siswa.
        </p>
      </div>

      <div className='rounded-lg border bg-card shadow-sm'>
        {loading ? <p className='p-5 text-sm text-muted-foreground'>Memuat assessment...</p> : null}
        {error ? <p className='m-5 rounded-md bg-destructive/10 p-3 text-sm text-destructive'>{error}</p> : null}

        {!loading && items.length === 0 ? (
          <div className='p-8 text-center'>
            <h2 className='text-lg font-semibold'>Belum ada assessment</h2>
            <p className='mt-2 text-sm text-muted-foreground'>
              Submission akan tersedia setelah assessment dibuat dan dipublish.
            </p>
          </div>
        ) : null}

        {items.length > 0 ? (
          <>
            <div className='divide-y md:hidden'>
              {items.map((item) => (
                <div className='space-y-3 p-4' key={item.id}>
                  <div className='flex items-start justify-between gap-3'>
                    <div className='min-w-0'>
                      <p className='font-semibold'>{item.title}</p>
                      <p className='text-sm text-muted-foreground'>{item.subject} - {item.grade}</p>
                      <p className='mt-1 text-xs text-muted-foreground'>{formatDateTime(item.updated_at)}</p>
                    </div>
                    <Badge variant='secondary'>{displayStatus(item.status)}</Badge>
                  </div>
                  <Button asChild size='sm'>
                    <Link href={`/submissions/${item.id}`}>Review Jawaban</Link>
                  </Button>
                </div>
              ))}
            </div>

            <div className='hidden md:block'>
              <table className='w-full text-sm'>
                <thead className='bg-muted/40 text-left text-xs uppercase text-muted-foreground'>
                  <tr>
                    <th className='px-5 py-3'>Judul</th>
                    <th className='px-5 py-3'>Mapel</th>
                    <th className='px-5 py-3'>Kelas</th>
                    <th className='px-5 py-3'>Status</th>
                    <th className='px-5 py-3'>Update</th>
                    <th className='px-5 py-3'>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr className='border-t' key={item.id}>
                      <td className='px-5 py-3 font-medium'>{item.title}</td>
                      <td className='px-5 py-3'>{item.subject}</td>
                      <td className='px-5 py-3'>{item.grade}</td>
                      <td className='px-5 py-3'><Badge variant='secondary'>{displayStatus(item.status)}</Badge></td>
                      <td className='px-5 py-3 text-muted-foreground'>{formatDateTime(item.updated_at)}</td>
                      <td className='px-5 py-3'>
                        <Button asChild size='sm'>
                          <Link href={`/submissions/${item.id}`}>Review Jawaban</Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
