'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { apiJson } from '@/lib/teachery-api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Assessment = {
  id: string
  title: string
  subject: string
  grade: string
  status: string
  updated_at: string
  public_slug?: string
  public_url?: string
}

type PublishResult = Assessment & {
  public_slug: string
  public_url: string
}

export default function AssessmentsPage() {
  const [items, setItems] = useState<Assessment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createTitle, setCreateTitle] = useState('')
  const [createSubject, setCreateSubject] = useState('')
  const [createGrade, setCreateGrade] = useState('')
  const [createBusy, setCreateBusy] = useState(false)
  const [createError, setCreateError] = useState('')
  const [deleteAssessment, setDeleteAssessment] = useState<Assessment | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [publishBusyID, setPublishBusyID] = useState('')
  const [publishDialog, setPublishDialog] = useState<PublishResult | null>(null)

  function displayStatus(status: string) {
    return status === 'published' || status === 'ready_to_export' || status === 'pdf_ready'
      ? 'Published'
      : 'Draft'
  }

  function isPublished(status: string) {
    return displayStatus(status) === 'Published'
  }

  async function loadAssessments() {
    setLoading(true)
    setError('')

    try {
      const res = await apiJson<Assessment[]>('/assessments')
      setItems(res.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat assessment.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadAssessments()
  }, [])

  async function handleCreateAssessment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setCreateError('')
    setMessage('')

    if (!createTitle.trim() || !createSubject.trim() || !createGrade.trim()) {
      setCreateError('Judul, mata pelajaran, dan kelas wajib diisi.')
      return
    }

    setCreateBusy(true)

    try {
      await apiJson<Assessment>('/assessments', {
        method: 'POST',
        body: JSON.stringify({
          title: createTitle.trim(),
          subject: createSubject.trim(),
          grade: createGrade.trim(),
          creation_mode: 'manual',
        }),
      })

      setCreateTitle('')
      setCreateSubject('')
      setCreateGrade('')
      setIsCreateOpen(false)
      setMessage('Assessment berhasil dibuat.')
      await loadAssessments()
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Gagal membuat assessment.')
    } finally {
      setCreateBusy(false)
    }
  }

  async function handleDeleteAssessment() {
    if (!deleteAssessment) return

    setDeleteBusy(true)
    setDeleteError('')
    setMessage('')

    try {
      await apiJson<{ success: boolean }>(`/assessments/${deleteAssessment.id}`, {
        method: 'DELETE',
      })
      setDeleteAssessment(null)
      setMessage(`Assessment "${deleteAssessment.title}" berhasil dihapus.`)
      await loadAssessments()
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Gagal menghapus assessment.')
    } finally {
      setDeleteBusy(false)
    }
  }

  async function handlePublishAssessment(item: Assessment) {
    setPublishBusyID(item.id)
    setError('')
    setMessage('')

    try {
      const res = await apiJson<PublishResult>(`/assessments/${item.id}/publish`, {
        method: 'POST',
      })
      setMessage(`Assessment "${item.title}" berhasil dipublish.`)
      setPublishDialog(res.data)
      await loadAssessments()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal publish assessment.')
    } finally {
      setPublishBusyID('')
    }
  }

  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <h1 className='text-2xl font-semibold text-foreground'>Assessment</h1>
          <p className='mt-1 text-sm text-muted-foreground'>
            Kelola assessment manual dan hasil generate AI.
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>Buat Assessment</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Buat Assessment</DialogTitle>
              <DialogDescription className='font-normal text-muted-foreground'>
                Isi metadata assessment terlebih dahulu. Soal dapat ditambahkan manual atau melalui AI setelah draft dibuat.
              </DialogDescription>
            </DialogHeader>

            <form className='space-y-4' onSubmit={handleCreateAssessment}>
              <div className='space-y-2'>
                <Label htmlFor='assessment-title'>Judul Assessment</Label>
                <Input
                  id='assessment-title'
                  placeholder='Contoh: Penilaian Harian Bab 2'
                  value={createTitle}
                  onChange={(event) => setCreateTitle(event.target.value)}
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='assessment-subject'>Mata Pelajaran</Label>
                <Input
                  id='assessment-subject'
                  placeholder='Contoh: Matematika'
                  value={createSubject}
                  onChange={(event) => setCreateSubject(event.target.value)}
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='assessment-grade'>Kelas</Label>
                <Input
                  id='assessment-grade'
                  placeholder='Contoh: VII A'
                  value={createGrade}
                  onChange={(event) => setCreateGrade(event.target.value)}
                />
              </div>

              {createError ? (
                <p className='rounded-md bg-destructive/10 p-3 text-sm text-destructive'>
                  {createError}
                </p>
              ) : null}

              <DialogFooter>
                <DialogClose asChild>
                  <Button type='button' variant='outline'>
                    Batal
                  </Button>
                </DialogClose>
                <Button type='submit' disabled={createBusy}>
                  {createBusy ? 'Menyimpan...' : 'Simpan Draft'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className='rounded-lg border bg-card shadow-sm'>
        {message ? <p className='m-5 rounded-md bg-primary/10 p-3 text-sm text-primary'>{message}</p> : null}
        {loading ? <p className='p-5 text-sm text-muted-foreground'>Memuat assessment...</p> : null}
        {error ? <p className='m-5 rounded-md bg-destructive/10 p-3 text-sm text-destructive'>{error}</p> : null}
        {!loading && items.length === 0 ? (
          <div className='p-8 text-center'>
            <h2 className='text-lg font-semibold'>Belum ada assessment</h2>
            <p className='mt-2 text-sm text-muted-foreground'>
              Buat draft manual terlebih dahulu, lalu tambahkan soal manual atau AI.
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
                  </div>
                  <Badge variant='secondary'>{displayStatus(item.status)}</Badge>
                </div>
                <div className='flex flex-wrap gap-2'>
                  <Button asChild size='sm' variant='outline'>
                    <Link href={`/assessments/${item.id}`}>Review</Link>
                  </Button>
                  <Button
                    disabled={publishBusyID === item.id}
                    size='sm'
                    type='button'
                    onClick={() => void handlePublishAssessment(item)}>
                    {publishBusyID === item.id ? 'Publishing...' : isPublished(item.status) ? 'Lihat QR' : 'Publish'}
                  </Button>
                  <Button
                    size='sm'
                    type='button'
                    variant='outlineerror'
                    onClick={() => {
                      setDeleteError('')
                      setDeleteAssessment(item)
                    }}>
                    Hapus
                  </Button>
                </div>
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
                    <td className='px-5 py-3'>
                      <div className='flex flex-wrap gap-2'>
                        <Button asChild size='sm' variant='outline'>
                          <Link href={`/assessments/${item.id}`}>Review</Link>
                        </Button>
                        <Button
                          disabled={publishBusyID === item.id}
                          size='sm'
                          type='button'
                          onClick={() => void handlePublishAssessment(item)}>
                          {publishBusyID === item.id ? 'Publishing...' : isPublished(item.status) ? 'Lihat QR' : 'Publish'}
                        </Button>
                        <Button
                          size='sm'
                          type='button'
                          variant='outlineerror'
                          onClick={() => {
                            setDeleteError('')
                            setDeleteAssessment(item)
                          }}>
                          Hapus
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        ) : null}
      </div>

      <Dialog open={Boolean(deleteAssessment)} onOpenChange={(open) => !open && setDeleteAssessment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Assessment</DialogTitle>
            <DialogDescription className='font-normal text-muted-foreground'>
              Assessment ini beserta seluruh pertanyaan dan gambar ilustrasinya akan dihapus. Riwayat job tetap disimpan.
            </DialogDescription>
          </DialogHeader>

          {deleteAssessment ? (
            <div className='rounded-md bg-muted/40 p-3 text-sm text-muted-foreground'>
              <p className='font-semibold text-foreground'>{deleteAssessment.title}</p>
              <p>{deleteAssessment.subject} - {deleteAssessment.grade}</p>
            </div>
          ) : null}

          {deleteError ? (
            <p className='rounded-md bg-destructive/10 p-3 text-sm text-destructive'>{deleteError}</p>
          ) : null}

          <DialogFooter>
            <DialogClose asChild>
              <Button disabled={deleteBusy} type='button' variant='outline'>
                Batal
              </Button>
            </DialogClose>
            <Button disabled={deleteBusy} type='button' variant='error' onClick={handleDeleteAssessment}>
              {deleteBusy ? 'Menghapus...' : 'Hapus Assessment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(publishDialog)} onOpenChange={(open) => !open && setPublishDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assessment Dipublish</DialogTitle>
            <DialogDescription className='font-normal text-muted-foreground'>
              Bagikan QR code atau link publik ini kepada siswa agar mereka dapat mengerjakan assessment.
            </DialogDescription>
          </DialogHeader>

          {publishDialog ? (
            <div className='space-y-4'>
              <div className='flex justify-center rounded-lg border bg-white p-5'>
                <QRCodeSVG value={publishDialog.public_url} size={220} level='M' />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='public-assessment-link'>Public Link</Label>
                <div className='flex gap-2'>
                  <Input id='public-assessment-link' readOnly value={publishDialog.public_url} />
                  <Button
                    type='button'
                    variant='outline'
                    onClick={() => void navigator.clipboard?.writeText(publishDialog.public_url)}>
                    Salin
                  </Button>
                </div>
              </div>

              <p className='rounded-md bg-muted/40 p-3 text-sm text-muted-foreground'>
                Siswa tidak perlu login. Jawaban yang dikirim dari link ini akan tersimpan di database.
              </p>
            </div>
          ) : null}

          <DialogFooter>
            <DialogClose asChild>
              <Button type='button'>Selesai</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
