'use client'

import { useEffect, useState } from 'react'
import { apiJson } from '@/lib/teachery-api'

type AuditLog = {
  id: string
  event_type: string
  actor_name?: string
  actor_user_id: string
  actor_role: string
  target_name?: string
  target_user_id?: string
  metadata_json?: string
  created_at: string
}

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    apiJson<AuditLog[]>('/admin/audit-logs')
      .then((res) => setLogs(res.data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Gagal memuat audit log.'))
  }, [])

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-2xl font-semibold'>Audit Log</h1>
        <p className='mt-1 text-sm text-muted-foreground'>Catatan read-only untuk aktivitas penting.</p>
      </div>
      <div className='rounded-lg border bg-card shadow-sm'>
        {error ? <p className='m-5 rounded-md bg-destructive/10 p-3 text-sm text-destructive'>{error}</p> : null}
        {logs.length === 0 ? <p className='p-5 text-sm text-muted-foreground'>Belum ada audit log.</p> : null}
        {logs.length > 0 ? (
          <>
          <div className='divide-y md:hidden'>
            {logs.map((log) => (
              <div className='space-y-3 p-4' key={log.id}>
                <div>
                  <p className='font-semibold'>{log.event_type}</p>
                  <p className='text-sm text-muted-foreground'>{log.created_at}</p>
                </div>
                <div className='grid grid-cols-1 gap-3 text-sm'>
                  <div>
                    <p className='text-xs text-muted-foreground'>Actor</p>
                    <p>{log.actor_name || log.actor_user_id} ({log.actor_role})</p>
                  </div>
                  <div>
                    <p className='text-xs text-muted-foreground'>Target</p>
                    <p>{log.target_name || log.target_user_id || '-'}</p>
                  </div>
                  <div>
                    <p className='text-xs text-muted-foreground'>Metadata</p>
                    <p className='break-words'>{log.metadata_json || '-'}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className='hidden md:block'>
            <table className='w-full text-sm'>
              <thead className='bg-muted/40 text-left text-xs uppercase text-muted-foreground'>
                <tr>
                  <th className='px-5 py-3'>Waktu</th>
                  <th className='px-5 py-3'>Event</th>
                  <th className='px-5 py-3'>Actor</th>
                  <th className='px-5 py-3'>Target</th>
                  <th className='px-5 py-3'>Metadata</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr className='border-t' key={log.id}>
                    <td className='px-5 py-3'>{log.created_at}</td>
                    <td className='px-5 py-3'>{log.event_type}</td>
                    <td className='px-5 py-3'>{log.actor_name || log.actor_user_id} ({log.actor_role})</td>
                    <td className='px-5 py-3'>{log.target_name || log.target_user_id || '-'}</td>
                    <td className='px-5 py-3'>{log.metadata_json || '-'}</td>
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
