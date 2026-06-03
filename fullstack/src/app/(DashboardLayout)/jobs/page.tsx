'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { apiJson } from '@/lib/teachery-api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

type Job = {
  id: string
  type: string
  status: string
  estimated_credit: number
  actual_credit: number
  credit_status: string
  input_snapshot_json?: string
  created_at: string
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    apiJson<Job[]>('/jobs')
      .then((res) => setJobs(res.data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Gagal memuat job.'))
  }, [])

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-2xl font-semibold'>Jobs AI</h1>
        <p className='mt-1 text-sm text-muted-foreground'>
          Pantau generate, regenerate, dan improve yang memakai Kredit.
        </p>
      </div>
      <div className='rounded-lg border bg-card shadow-sm'>
        {error ? <p className='m-5 rounded-md bg-destructive/10 p-3 text-sm text-destructive'>{error}</p> : null}
        {jobs.length === 0 ? <p className='p-5 text-sm text-muted-foreground'>Belum ada job AI.</p> : null}
        {jobs.length > 0 ? (
          <>
          <div className='divide-y md:hidden'>
            {jobs.map((job) => (
              <div className='space-y-3 p-4' key={job.id}>
                <div className='flex items-start justify-between gap-3'>
                  <div className='min-w-0'>
                    <p className='break-all font-mono text-xs'>{job.id}</p>
                    <p className='mt-1 break-all text-sm text-muted-foreground'>{job.type}</p>
                  </div>
                  <Badge variant='secondary'>{job.status}</Badge>
                </div>
                <div className='flex items-center justify-between gap-3'>
                  <div>
                    <p className='text-xs text-muted-foreground'>Kredit</p>
                    <p className='font-semibold'>{job.actual_credit || job.estimated_credit}</p>
                  </div>
                  {assessmentLink(job)}
                </div>
              </div>
            ))}
          </div>
          <div className='hidden md:block'>
            <table className='w-full text-sm'>
              <thead className='bg-muted/40 text-left text-xs uppercase text-muted-foreground'>
                <tr>
                  <th className='px-5 py-3'>Job</th>
                  <th className='px-5 py-3'>Tipe</th>
                  <th className='px-5 py-3'>Status</th>
                  <th className='px-5 py-3'>Kredit</th>
                  <th className='px-5 py-3'>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr className='border-t' key={job.id}>
                    <td className='px-5 py-3 font-mono text-xs'>{job.id}</td>
                    <td className='px-5 py-3'>{job.type}</td>
                    <td className='px-5 py-3'><Badge variant='secondary'>{job.status}</Badge></td>
                    <td className='px-5 py-3'>{job.actual_credit || job.estimated_credit}</td>
                    <td className='px-5 py-3'>{assessmentLink(job)}</td>
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

function assessmentLink(job: Job) {
  const assessmentId = assessmentIdFromJob(job)
  if (!assessmentId || job.status !== 'completed') {
    return <span className='text-muted-foreground'>-</span>
  }
  return (
    <Button asChild size='sm' variant='outline'>
      <Link href={`/assessments/${assessmentId}`}>Review</Link>
    </Button>
  )
}

function assessmentIdFromJob(job: Job) {
  if (!job.input_snapshot_json) return ''
  try {
    const input = JSON.parse(job.input_snapshot_json) as { assessment_id?: string }
    return input.assessment_id ?? ''
  } catch {
    return ''
  }
}
