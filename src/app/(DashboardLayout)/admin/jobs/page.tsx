'use client'

import { FormEvent, useEffect, useState } from 'react'
import { apiJson } from '@/lib/teachery-api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type Job = {
  id: string
  owner_name?: string
  owner_user_id: string
  type: string
  status: string
  estimated_credit: number
  actual_credit: number
  credit_status: string
}

type JobCost = {
  job_type: string
  display_name: string
  calculation_type: string
  unit_credit: number
  is_active: boolean
}

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [jobCosts, setJobCosts] = useState<JobCost[]>([])
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [addCostOpen, setAddCostOpen] = useState(false)
  const [addBusy, setAddBusy] = useState(false)
  const [addError, setAddError] = useState('')
  const [addJobType, setAddJobType] = useState('')
  const [addDisplayName, setAddDisplayName] = useState('')
  const [addCalculationType, setAddCalculationType] = useState('fixed')
  const [addUnitCredit, setAddUnitCredit] = useState('1')
  const [addIsActive, setAddIsActive] = useState('active')
  const [editCost, setEditCost] = useState<JobCost | null>(null)
  const [editBusy, setEditBusy] = useState(false)
  const [editError, setEditError] = useState('')
  const [editDisplayName, setEditDisplayName] = useState('')
  const [editCalculationType, setEditCalculationType] = useState('fixed')
  const [editUnitCredit, setEditUnitCredit] = useState('1')
  const [editIsActive, setEditIsActive] = useState('active')

  async function loadJobs() {
    apiJson<Job[]>('/admin/jobs')
      .then((res) => setJobs(res.data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Gagal memuat job.'))
  }

  async function loadJobCosts() {
    apiJson<JobCost[]>('/admin/job-costs')
      .then((res) => setJobCosts(res.data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Gagal memuat biaya job.'))
  }

  useEffect(() => {
    void loadJobs()
    void loadJobCosts()
  }, [])

  function openEditCostModal(cost: JobCost) {
    setEditCost(cost)
    setEditDisplayName(cost.display_name)
    setEditCalculationType(cost.calculation_type)
    setEditUnitCredit(String(cost.unit_credit))
    setEditIsActive(cost.is_active ? 'active' : 'inactive')
    setEditError('')
  }

  function resetAddCostForm() {
    setAddJobType('')
    setAddDisplayName('')
    setAddCalculationType('fixed')
    setAddUnitCredit('1')
    setAddIsActive('active')
    setAddError('')
  }

  async function handleAddCost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAddError('')
    setMessage('')

    const jobType = addJobType.trim()
    const unitCredit = Number.parseInt(addUnitCredit, 10)
    if (!jobType) {
      setAddError('Job type wajib diisi.')
      return
    }
    if (!/^[a-z0-9_-]+$/.test(jobType)) {
      setAddError('Job type hanya boleh memakai huruf kecil, angka, underscore, atau dash.')
      return
    }
    if (jobCosts.some((cost) => cost.job_type === jobType)) {
      setAddError('Job type sudah ada. Gunakan tombol Edit untuk mengubah biaya.')
      return
    }
    if (!addDisplayName.trim()) {
      setAddError('Nama job wajib diisi.')
      return
    }
    if (Number.isNaN(unitCredit) || unitCredit < 0) {
      setAddError('Kredit tidak boleh negatif.')
      return
    }

    setAddBusy(true)
    try {
      await apiJson<JobCost>(`/admin/job-costs/${encodeURIComponent(jobType)}`, {
        method: 'PUT',
        body: JSON.stringify({
          display_name: addDisplayName.trim(),
          calculation_type: addCalculationType,
          unit_credit: unitCredit,
          is_active: addIsActive === 'active',
        }),
      })

      setAddCostOpen(false)
      resetAddCostForm()
      setMessage(`Job cost ${jobType} berhasil ditambahkan.`)
      await loadJobCosts()
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Gagal menambahkan job cost.')
    } finally {
      setAddBusy(false)
    }
  }

  async function handleEditCost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setEditError('')
    setMessage('')
    if (!editCost) return

    const unitCredit = Number.parseInt(editUnitCredit, 10)
    if (!editDisplayName.trim()) {
      setEditError('Nama job wajib diisi.')
      return
    }
    if (Number.isNaN(unitCredit) || unitCredit < 0) {
      setEditError('Kredit tidak boleh negatif.')
      return
    }

    setEditBusy(true)
    try {
      await apiJson<JobCost>(`/admin/job-costs/${editCost.job_type}`, {
        method: 'PUT',
        body: JSON.stringify({
          display_name: editDisplayName.trim(),
          calculation_type: editCalculationType,
          unit_credit: unitCredit,
          is_active: editIsActive === 'active',
        }),
      })

      setEditCost(null)
      setMessage(`Job cost ${editCost.job_type} berhasil diperbarui.`)
      await loadJobCosts()
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Gagal memperbarui job cost.')
    } finally {
      setEditBusy(false)
    }
  }

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-2xl font-semibold'>Job Monitoring</h1>
        <p className='mt-1 text-sm text-muted-foreground'>Pantau semua job AI Guru.</p>
      </div>
      {message ? <p className='rounded-md bg-primary/10 p-3 text-sm text-primary'>{message}</p> : null}
      {error ? <p className='rounded-md bg-destructive/10 p-3 text-sm text-destructive'>{error}</p> : null}
      <div className='rounded-lg border bg-card shadow-sm'>
        <div className='flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <h2 className='text-lg font-semibold'>Job Cost</h2>
            <p className='mt-1 text-sm text-muted-foreground'>Master biaya kredit untuk setiap jenis job AI.</p>
          </div>
          <Button className='w-full sm:w-auto' type='button' onClick={() => setAddCostOpen(true)}>
            <Plus className='mr-2 h-4 w-4' />
            Add Job Cost
          </Button>
        </div>
        {jobCosts.length === 0 ? <p className='p-5 text-sm text-muted-foreground'>Belum ada konfigurasi biaya job.</p> : null}
        {jobCosts.length > 0 ? (
          <>
          <div className='divide-y md:hidden'>
            {jobCosts.map((cost) => (
              <div className='space-y-3 p-4' key={cost.job_type}>
                <div className='flex items-start justify-between gap-3'>
                  <div className='min-w-0'>
                    <p className='break-all font-semibold'>{cost.job_type}</p>
                    <p className='text-sm text-muted-foreground'>{cost.display_name}</p>
                  </div>
                  <Button size='sm' type='button' variant='outline' onClick={() => openEditCostModal(cost)}>
                    Edit
                  </Button>
                </div>
                <div className='grid grid-cols-2 gap-3 text-sm'>
                  <div>
                    <p className='text-xs text-muted-foreground'>Perhitungan</p>
                    <p>{cost.calculation_type === 'per_question' ? 'Per soal' : 'Tetap'}</p>
                  </div>
                  <div>
                    <p className='text-xs text-muted-foreground'>Kredit</p>
                    <p className='font-semibold'>{cost.unit_credit}</p>
                  </div>
                  <div>
                    <p className='text-xs text-muted-foreground'>Status</p>
                    <Badge variant={cost.is_active ? 'secondary' : 'outline'}>
                      {cost.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className='hidden md:block'>
            <table className='w-full text-sm'>
              <thead className='bg-muted/40 text-left text-xs uppercase text-muted-foreground'>
                <tr>
                  <th className='px-5 py-3'>Job Type</th>
                  <th className='px-5 py-3'>Nama</th>
                  <th className='px-5 py-3'>Perhitungan</th>
                  <th className='px-5 py-3'>Kredit</th>
                  <th className='px-5 py-3'>Status</th>
                  <th className='px-5 py-3 text-right'>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {jobCosts.map((cost) => (
                  <tr className='border-t' key={cost.job_type}>
                    <td className='px-5 py-3 font-medium'>{cost.job_type}</td>
                    <td className='px-5 py-3'>{cost.display_name}</td>
                    <td className='px-5 py-3'>
                      {cost.calculation_type === 'per_question' ? 'Per soal' : 'Tetap'}
                    </td>
                    <td className='px-5 py-3 font-semibold'>{cost.unit_credit}</td>
                    <td className='px-5 py-3'>
                      <Badge variant={cost.is_active ? 'secondary' : 'outline'}>
                        {cost.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className='px-5 py-3 text-right'>
                      <Button size='sm' type='button' variant='outline' onClick={() => openEditCostModal(cost)}>
                        Edit
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
      <div className='rounded-lg border bg-card shadow-sm'>
        <div className='border-b px-5 py-4'>
          <h2 className='text-lg font-semibold'>Job Monitoring</h2>
          <p className='mt-1 text-sm text-muted-foreground'>Riwayat job AI yang dibuat oleh Guru.</p>
        </div>
        {jobs.length === 0 ? <p className='p-5 text-sm text-muted-foreground'>Belum ada job.</p> : null}
        {jobs.length > 0 ? (
          <>
          <div className='divide-y md:hidden'>
            {jobs.map((job) => (
              <div className='space-y-3 p-4' key={job.id}>
                <div className='flex items-start justify-between gap-3'>
                  <div className='min-w-0'>
                    <p className='font-semibold'>{job.owner_name || job.owner_user_id}</p>
                    <p className='break-all font-mono text-xs text-muted-foreground'>{job.id}</p>
                  </div>
                  <Badge variant='secondary'>{job.status}</Badge>
                </div>
                <div className='grid grid-cols-2 gap-3 text-sm'>
                  <div>
                    <p className='text-xs text-muted-foreground'>Tipe</p>
                    <p className='break-all'>{job.type}</p>
                  </div>
                  <div>
                    <p className='text-xs text-muted-foreground'>Kredit</p>
                    <p className='font-semibold'>{job.actual_credit || job.estimated_credit}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className='hidden md:block'>
            <table className='w-full text-sm'>
              <thead className='bg-muted/40 text-left text-xs uppercase text-muted-foreground'>
                <tr>
                  <th className='px-5 py-3'>Owner</th>
                  <th className='px-5 py-3'>Tipe</th>
                  <th className='px-5 py-3'>Status</th>
                  <th className='px-5 py-3'>Kredit</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr className='border-t' key={job.id}>
                    <td className='px-5 py-3'>{job.owner_name || job.owner_user_id}</td>
                    <td className='px-5 py-3'>{job.type}</td>
                    <td className='px-5 py-3'><Badge variant='secondary'>{job.status}</Badge></td>
                    <td className='px-5 py-3'>{job.actual_credit || job.estimated_credit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        ) : null}
      </div>

      <Dialog
        open={addCostOpen}
        onOpenChange={(open) => {
          setAddCostOpen(open)
          if (!open) resetAddCostForm()
        }}
      >
        <DialogContent className='max-w-xl'>
          <DialogHeader>
            <DialogTitle>Add Job Cost</DialogTitle>
            <DialogDescription className='font-normal text-muted-foreground'>
              Tambahkan konfigurasi biaya kredit untuk jenis job AI baru.
            </DialogDescription>
          </DialogHeader>

          <form className='space-y-4' onSubmit={handleAddCost}>
            <div className='space-y-2'>
              <Label htmlFor='add-job-type'>Job Type</Label>
              <Input
                id='add-job-type'
                placeholder='generate_custom_job'
                value={addJobType}
                onChange={(event) => setAddJobType(event.target.value)}
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='add-display-name'>Nama</Label>
              <Input
                id='add-display-name'
                placeholder='Generate Custom Job AI'
                value={addDisplayName}
                onChange={(event) => setAddDisplayName(event.target.value)}
              />
            </div>

            <div className='grid gap-4 md:grid-cols-2'>
              <div className='space-y-2'>
                <Label>Perhitungan</Label>
                <Select value={addCalculationType} onValueChange={setAddCalculationType}>
                  <SelectTrigger className='w-full'><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value='fixed'>Tetap</SelectItem>
                    <SelectItem value='per_question'>Per soal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className='space-y-2'>
                <Label htmlFor='add-unit-credit'>Kredit</Label>
                <Input
                  id='add-unit-credit'
                  min={0}
                  type='number'
                  value={addUnitCredit}
                  onChange={(event) => setAddUnitCredit(event.target.value)}
                />
              </div>
            </div>

            <div className='space-y-2'>
              <Label>Status</Label>
              <Select value={addIsActive} onValueChange={setAddIsActive}>
                <SelectTrigger className='w-full'><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value='active'>Active</SelectItem>
                  <SelectItem value='inactive'>Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {addError ? <p className='rounded-md bg-destructive/10 p-3 text-sm text-destructive'>{addError}</p> : null}

            <DialogFooter>
              <DialogClose asChild>
                <Button disabled={addBusy} type='button' variant='outline'>Batal</Button>
              </DialogClose>
              <Button disabled={addBusy} type='submit'>
                {addBusy ? 'Menyimpan...' : 'Tambah Job Cost'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editCost)} onOpenChange={(open) => !open && setEditCost(null)}>
        <DialogContent className='max-w-xl'>
          <DialogHeader>
            <DialogTitle>Edit Job Cost</DialogTitle>
            <DialogDescription className='font-normal text-muted-foreground'>
              Perubahan biaya ini akan dipakai untuk estimasi dan charging job baru berikutnya.
            </DialogDescription>
          </DialogHeader>

          <form className='space-y-4' onSubmit={handleEditCost}>
            <div className='space-y-2'>
              <Label>Job Type</Label>
              <Input readOnly value={editCost?.job_type ?? ''} />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='edit-display-name'>Nama</Label>
              <Input id='edit-display-name' value={editDisplayName} onChange={(event) => setEditDisplayName(event.target.value)} />
            </div>

            <div className='grid gap-4 md:grid-cols-2'>
              <div className='space-y-2'>
                <Label>Perhitungan</Label>
                <Select value={editCalculationType} onValueChange={setEditCalculationType}>
                  <SelectTrigger className='w-full'><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value='fixed'>Tetap</SelectItem>
                    <SelectItem value='per_question'>Per soal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className='space-y-2'>
                <Label htmlFor='edit-unit-credit'>Kredit</Label>
                <Input
                  id='edit-unit-credit'
                  min={0}
                  type='number'
                  value={editUnitCredit}
                  onChange={(event) => setEditUnitCredit(event.target.value)}
                />
              </div>
            </div>

            <div className='space-y-2'>
              <Label>Status</Label>
              <Select value={editIsActive} onValueChange={setEditIsActive}>
                <SelectTrigger className='w-full'><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value='active'>Active</SelectItem>
                  <SelectItem value='inactive'>Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {editError ? <p className='rounded-md bg-destructive/10 p-3 text-sm text-destructive'>{editError}</p> : null}

            <DialogFooter>
              <DialogClose asChild>
                <Button disabled={editBusy} type='button' variant='outline'>Batal</Button>
              </DialogClose>
              <Button disabled={editBusy} type='submit'>
                {editBusy ? 'Menyimpan...' : 'Simpan Perubahan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
