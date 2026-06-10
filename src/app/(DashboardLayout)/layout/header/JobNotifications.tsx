'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '@iconify/react'
import { getApiBaseUrl } from '@/lib/api'
import { getStoredToken } from '@/lib/auth'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

type Job = {
  id: string
  type: string
  status: string
  estimated_credit: number
  actual_credit: number
  error_message?: string | null
  input_snapshot_json?: string
  created_at: string
}

const seenStorageKey = 'teachery_seen_job_notifications'

export default function JobNotifications() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [open, setOpen] = useState(false)
  const [seenIDs, setSeenIDs] = useState<string[]>([])
  const [error, setError] = useState('')
  const seedSeenOnFirstLoad = useRef(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(seenStorageKey)
      if (saved) {
        setSeenIDs(JSON.parse(saved))
      } else {
        seedSeenOnFirstLoad.current = true
      }
    } catch {
      setSeenIDs([])
      seedSeenOnFirstLoad.current = true
    }

    const token = getStoredToken()
    if (!token) {
      setError('Sesi tidak valid. Silakan login ulang.')
      return
    }

    const url = `${getApiBaseUrl()}/jobs/notifications?access_token=${encodeURIComponent(token)}`
    const source = new EventSource(url)

    source.addEventListener('jobs.snapshot', (event) => {
      const payload = parseEventData<{ jobs?: Job[] }>(event)
      const nextJobs = (payload.jobs ?? []).slice(0, 12)
      setJobs(nextJobs)
      seedInitialSeenIDs(nextJobs)
      setError('')
    })

    source.addEventListener('job.updated', (event) => {
      const payload = parseEventData<{ job?: Job }>(event)
      if (!payload.job) return

      window.dispatchEvent(new CustomEvent('teachery:job-updated', { detail: payload.job }))
      setJobs((current) => {
        const withoutCurrent = current.filter((job) => job.id !== payload.job?.id)
        return [payload.job as Job, ...withoutCurrent].slice(0, 12)
      })
      setError('')
    })

    source.onerror = () => {
      setError('Koneksi notifikasi job terputus. Refresh halaman untuk menyambungkan ulang.')
    }

    return () => {
      source.close()
    }
  }, [])

  const terminalJobs = useMemo(
    () => jobs.filter((job) => job.status === 'completed' || job.status === 'failed'),
    [jobs]
  )
  const unreadCount = terminalJobs.filter((job) => !seenIDs.includes(job.id)).length
  const processingCount = jobs.filter((job) => job.status === 'processing' || job.status === 'waiting').length

  function toggleOpen() {
    setOpen((current) => {
      const next = !current
      if (next) markVisibleAsSeen()
      return next
    })
  }

  function markVisibleAsSeen() {
    const nextIDs = Array.from(new Set([...seenIDs, ...terminalJobs.map((job) => job.id)])).slice(-80)
    setSeenIDs(nextIDs)
    try {
      localStorage.setItem(seenStorageKey, JSON.stringify(nextIDs))
    } catch {
      // Ignore storage failures; notifications still work for this session.
    }
  }

  function seedInitialSeenIDs(nextJobs: Job[]) {
    if (!seedSeenOnFirstLoad.current) return
    seedSeenOnFirstLoad.current = false

    const terminalIDs = nextJobs
      .filter((job) => job.status === 'completed' || job.status === 'failed')
      .map((job) => job.id)
    setSeenIDs(terminalIDs)
    try {
      localStorage.setItem(seenStorageKey, JSON.stringify(terminalIDs))
    } catch {
      // Ignore storage failures; notifications still work for this session.
    }
  }

  return (
    <div className='relative'>
      <button
        aria-label='Notifikasi job AI'
        className='group relative flex size-9 cursor-pointer items-center justify-center rounded-md border border-border bg-card text-foreground shadow-sm transition hover:border-primary/30 hover:bg-accent hover:text-primary'
        type='button'
        onClick={toggleOpen}>
        <Icon icon='tabler:bell' width='20' />
        {unreadCount > 0 ? (
          <span className='absolute -right-1 -top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground'>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : processingCount > 0 ? (
          <span className='absolute -right-1 -top-1 h-3 w-3 rounded-full bg-primary ring-2 ring-background' />
        ) : null}
      </button>

      {open ? (
        <div className='absolute right-0 top-11 z-50 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-lg border bg-card shadow-lg'>
          <div className='flex items-center justify-between gap-3 border-b px-4 py-3'>
            <div>
              <p className='text-sm font-semibold'>Notifikasi AI</p>
              <p className='text-xs text-muted-foreground'>{processingCount} job sedang diproses</p>
            </div>
            <Button asChild size='sm' variant='outline'>
              <Link href='/jobs' onClick={() => setOpen(false)}>Lihat Jobs</Link>
            </Button>
          </div>

          {error ? <p className='m-3 rounded-md bg-destructive/10 p-3 text-sm text-destructive'>{error}</p> : null}
          {!error && jobs.length === 0 ? (
            <p className='p-4 text-sm text-muted-foreground'>Belum ada job AI.</p>
          ) : null}
          {!error && jobs.length > 0 ? (
            <div className='max-h-96 divide-y overflow-y-auto'>
              {jobs.map((job) => (
                <div className='space-y-2 p-4' key={job.id}>
                  <div className='flex items-start justify-between gap-3'>
                    <div className='min-w-0'>
                      <p className='truncate text-sm font-semibold'>{jobTitle(job)}</p>
                      <p className='mt-1 truncate font-mono text-[11px] text-muted-foreground'>{job.id}</p>
                    </div>
                    <Badge variant={job.status === 'failed' ? 'destructive' : 'secondary'}>
                      {job.status}
                    </Badge>
                  </div>
                  <p className='text-xs text-muted-foreground'>
                    Kredit: {job.actual_credit || job.estimated_credit}
                  </p>
                  {job.error_message ? (
                    <p className='line-clamp-2 text-xs text-destructive'>{job.error_message}</p>
                  ) : null}
                  {jobLink(job)}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function jobTitle(job: Job) {
  if (job.type === 'generate_question_image') return 'Generate gambar soal'
  if (job.type === 'generate_explanation') return 'Generate pembahasan'
  if (job.type === 'generate_questions') return 'Generate soal'
  return job.type
}

function jobLink(job: Job) {
  const input = jobInput(job)
  if (input.assessment_id && job.status === 'completed') {
    return (
      <Button asChild size='sm' variant='outline'>
        <Link href={`/assessments/${input.assessment_id}`}>Buka Assessment</Link>
      </Button>
    )
  }
  if ((input.question_bank_id || input.question_bank) && job.status === 'completed') {
    return (
      <Button asChild size='sm' variant='outline'>
        <Link href='/question-bank'>Buka Bank Soal</Link>
      </Button>
    )
  }
  return null
}

function jobInput(job: Job) {
  try {
    return JSON.parse(job.input_snapshot_json || '{}') as {
      assessment_id?: string
      question_bank_id?: string
      question_bank?: boolean
    }
  } catch {
    return {}
  }
}

function parseEventData<T>(event: Event) {
  try {
    return JSON.parse((event as MessageEvent<string>).data || '{}') as T
  } catch {
    return {} as T
  }
}
