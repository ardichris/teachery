'use client'

import { FormEvent, useEffect, useState } from 'react'
import { apiJson } from '@/lib/teachery-api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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

type AdminUser = {
  id: string
  name: string
  email: string
  role: string
  status: string
  credit_balance: number
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [createBusy, setCreateBusy] = useState(false)
  const [createError, setCreateError] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('guru')
  const [status, setStatus] = useState('active')
  const [initialCredit, setInitialCredit] = useState('0')
  const [editUser, setEditUser] = useState<AdminUser | null>(null)
  const [editBusy, setEditBusy] = useState(false)
  const [editError, setEditError] = useState('')
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editRole, setEditRole] = useState('guru')
  const [editStatus, setEditStatus] = useState('active')
  const [editReason, setEditReason] = useState('')

  async function loadUsers() {
    setError('')
    apiJson<AdminUser[]>('/admin/users')
      .then((res) => setUsers(res.data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Gagal memuat user.'))
  }

  useEffect(() => {
    void loadUsers()
  }, [])

  function openCreateModal() {
    setName('')
    setEmail('')
    setPassword('')
    setRole('guru')
    setStatus('active')
    setInitialCredit('0')
    setCreateError('')
    setCreateOpen(true)
  }

  async function handleCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setCreateError('')
    setMessage('')

    const credit = Number.parseInt(initialCredit, 10)
    if (!name.trim()) {
      setCreateError('Nama wajib diisi.')
      return
    }
    if (!email.trim() || !email.includes('@')) {
      setCreateError('Email tidak valid.')
      return
    }
    if (password.length < 8) {
      setCreateError('Password minimal 8 karakter.')
      return
    }
    if (Number.isNaN(credit) || credit < 0) {
      setCreateError('Kredit awal tidak boleh negatif.')
      return
    }

    setCreateBusy(true)
    try {
      await apiJson<AdminUser>('/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          role,
          status,
          initial_credit: credit,
        }),
      })

      setCreateOpen(false)
      setMessage(`User ${name.trim()} berhasil ditambahkan.`)
      await loadUsers()
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Gagal menambahkan user.')
    } finally {
      setCreateBusy(false)
    }
  }

  function openEditModal(user: AdminUser) {
    setEditUser(user)
    setEditName(user.name)
    setEditEmail(user.email)
    setEditRole(user.role)
    setEditStatus(user.status)
    setEditReason('')
    setEditError('')
  }

  async function handleEditUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setEditError('')
    setMessage('')
    if (!editUser) return

    const roleChanged = editRole !== editUser.role
    const statusChanged = editStatus !== editUser.status

    if (!editName.trim()) {
      setEditError('Nama wajib diisi.')
      return
    }
    if (!editEmail.trim() || !editEmail.includes('@')) {
      setEditError('Email tidak valid.')
      return
    }
    if ((roleChanged || statusChanged) && !editReason.trim()) {
      setEditError('Alasan wajib diisi jika role atau status berubah.')
      return
    }

    setEditBusy(true)
    try {
      await apiJson<AdminUser>(`/admin/users/${editUser.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editName.trim(),
          email: editEmail.trim().toLowerCase(),
        }),
      })

      if (roleChanged) {
        await apiJson<AdminUser>(`/admin/users/${editUser.id}/role`, {
          method: 'PATCH',
          body: JSON.stringify({
            role: editRole,
            reason: editReason.trim(),
          }),
        })
      }

      if (statusChanged) {
        await apiJson<AdminUser>(`/admin/users/${editUser.id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({
            status: editStatus,
            reason: editReason.trim(),
          }),
        })
      }

      setEditUser(null)
      setMessage(`User ${editName.trim()} berhasil diperbarui.`)
      await loadUsers()
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Gagal memperbarui user.')
    } finally {
      setEditBusy(false)
    }
  }

  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap items-start justify-between gap-4'>
        <div>
          <h1 className='text-2xl font-semibold'>User Management</h1>
          <p className='mt-1 text-sm text-muted-foreground'>Daftar Admin dan Guru Teachery.</p>
        </div>
        <Button onClick={openCreateModal}>Tambah User</Button>
      </div>
      {message ? <p className='rounded-md bg-primary/10 p-3 text-sm text-primary'>{message}</p> : null}
      <div className='rounded-lg border bg-card shadow-sm'>
        {error ? <p className='m-5 rounded-md bg-destructive/10 p-3 text-sm text-destructive'>{error}</p> : null}
        <div className='divide-y md:hidden'>
          {users.map((user) => (
            <div className='space-y-3 p-4' key={user.id}>
              <div className='flex items-start justify-between gap-3'>
                <div className='min-w-0'>
                  <p className='truncate font-semibold'>{user.name}</p>
                  <p className='break-all text-sm text-muted-foreground'>{user.email}</p>
                </div>
                <Button size='sm' type='button' variant='outline' onClick={() => openEditModal(user)}>
                  Edit
                </Button>
              </div>
              <div className='grid grid-cols-2 gap-3 text-sm'>
                <div>
                  <p className='text-xs text-muted-foreground'>Role</p>
                  <Badge>{user.role}</Badge>
                </div>
                <div>
                  <p className='text-xs text-muted-foreground'>Status</p>
                  <Badge variant='secondary'>{user.status}</Badge>
                </div>
                <div>
                  <p className='text-xs text-muted-foreground'>Kredit</p>
                  <p className='font-semibold'>{user.credit_balance}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className='hidden md:block'>
          <table className='w-full text-sm'>
            <thead className='bg-muted/40 text-left text-xs uppercase text-muted-foreground'>
              <tr>
                <th className='px-5 py-3'>Nama</th>
                <th className='px-5 py-3'>Email</th>
                <th className='px-5 py-3'>Role</th>
                <th className='px-5 py-3'>Status</th>
                <th className='px-5 py-3'>Kredit</th>
                <th className='px-5 py-3 text-right'>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr className='border-t' key={user.id}>
                  <td className='px-5 py-3 font-medium'>{user.name}</td>
                  <td className='px-5 py-3'>{user.email}</td>
                  <td className='px-5 py-3'><Badge>{user.role}</Badge></td>
                  <td className='px-5 py-3'><Badge variant='secondary'>{user.status}</Badge></td>
                  <td className='px-5 py-3'>{user.credit_balance}</td>
                  <td className='px-5 py-3 text-right'>
                    <Button size='sm' type='button' variant='outline' onClick={() => openEditModal(user)}>
                      Edit
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className='max-w-xl'>
          <DialogHeader>
            <DialogTitle>Tambah User</DialogTitle>
            <DialogDescription className='font-normal text-muted-foreground'>
              Buat akun Admin atau Guru baru beserta kredit awalnya.
            </DialogDescription>
          </DialogHeader>

          <form className='space-y-4' onSubmit={handleCreateUser}>
            <div className='grid gap-4 md:grid-cols-2'>
              <div className='space-y-2'>
                <Label htmlFor='create-name'>Nama</Label>
                <Input id='create-name' value={name} onChange={(event) => setName(event.target.value)} />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='create-email'>Email</Label>
                <Input id='create-email' type='email' value={email} onChange={(event) => setEmail(event.target.value)} />
              </div>
            </div>

            <div className='grid gap-4 md:grid-cols-2'>
              <div className='space-y-2'>
                <Label htmlFor='create-password'>Password</Label>
                <Input id='create-password' type='password' value={password} onChange={(event) => setPassword(event.target.value)} />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='create-credit'>Kredit Awal</Label>
                <Input id='create-credit' min={0} type='number' value={initialCredit} onChange={(event) => setInitialCredit(event.target.value)} />
              </div>
            </div>

            <div className='grid gap-4 md:grid-cols-2'>
              <div className='space-y-2'>
                <Label>Role</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger className='w-full'><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value='guru'>Guru</SelectItem>
                    <SelectItem value='admin'>Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className='space-y-2'>
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className='w-full'><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value='active'>Active</SelectItem>
                    <SelectItem value='inactive'>Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {createError ? <p className='rounded-md bg-destructive/10 p-3 text-sm text-destructive'>{createError}</p> : null}

            <DialogFooter>
              <DialogClose asChild>
                <Button disabled={createBusy} type='button' variant='outline'>Batal</Button>
              </DialogClose>
              <Button disabled={createBusy} type='submit'>
                {createBusy ? 'Menyimpan...' : 'Simpan User'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editUser)} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent className='max-w-xl'>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription className='font-normal text-muted-foreground'>
              Perbarui profil, role, dan status user. Perubahan role atau status membutuhkan alasan audit.
            </DialogDescription>
          </DialogHeader>

          <form className='space-y-4' onSubmit={handleEditUser}>
            <div className='grid gap-4 md:grid-cols-2'>
              <div className='space-y-2'>
                <Label htmlFor='edit-name'>Nama</Label>
                <Input id='edit-name' value={editName} onChange={(event) => setEditName(event.target.value)} />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='edit-email'>Email</Label>
                <Input id='edit-email' type='email' value={editEmail} onChange={(event) => setEditEmail(event.target.value)} />
              </div>
            </div>

            <div className='grid gap-4 md:grid-cols-2'>
              <div className='space-y-2'>
                <Label>Role</Label>
                <Select value={editRole} onValueChange={setEditRole}>
                  <SelectTrigger className='w-full'><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value='guru'>Guru</SelectItem>
                    <SelectItem value='admin'>Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className='space-y-2'>
                <Label>Status</Label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger className='w-full'><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value='active'>Active</SelectItem>
                    <SelectItem value='inactive'>Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='edit-reason'>Alasan Perubahan Role/Status</Label>
              <Input
                id='edit-reason'
                placeholder='Wajib jika role atau status berubah'
                value={editReason}
                onChange={(event) => setEditReason(event.target.value)}
              />
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
