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
import { Textarea } from '@/components/ui/textarea'

type CreditTransaction = {
  id: string
  user_name?: string
  user_id: string
  amount: number
  type: string
  status: string
  reason?: string
  created_at: string
}

type AdminUser = {
  id: string
  name: string
  email: string
  role: string
  status: string
  credit_balance: number
}

function formatIndonesianDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value || '-'

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Jakarta',
  }).format(date)
}

export default function AdminCreditsPage() {
  const [transactions, setTransactions] = useState<CreditTransaction[]>([])
  const [users, setUsers] = useState<AdminUser[]>([])
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [adjustBusy, setAdjustBusy] = useState(false)
  const [adjustError, setAdjustError] = useState('')
  const [selectedUserID, setSelectedUserID] = useState('')
  const [adjustType, setAdjustType] = useState('admin_add')
  const [adjustAmount, setAdjustAmount] = useState('1')
  const [adjustReason, setAdjustReason] = useState('')

  async function loadTransactions() {
    setError('')
    apiJson<CreditTransaction[]>('/admin/credits/transactions')
      .then((res) => setTransactions(res.data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Gagal memuat transaksi.'))
  }

  async function loadUsers() {
    apiJson<AdminUser[]>('/admin/users')
      .then((res) => setUsers(res.data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Gagal memuat user.'))
  }

  useEffect(() => {
    void loadTransactions()
    void loadUsers()
  }, [])

  function openAdjustModal() {
    setSelectedUserID(users[0]?.id ?? '')
    setAdjustType('admin_add')
    setAdjustAmount('1')
    setAdjustReason('')
    setAdjustError('')
    setAdjustOpen(true)
  }

  async function handleAdjustCredit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAdjustError('')
    setMessage('')

    const amountValue = Number.parseInt(adjustAmount, 10)
    if (!selectedUserID) {
      setAdjustError('Pilih user terlebih dahulu.')
      return
    }
    if (!amountValue || amountValue < 1) {
      setAdjustError('Jumlah kredit harus lebih dari 0.')
      return
    }
    if (!adjustReason.trim()) {
      setAdjustError('Alasan perubahan kredit wajib diisi.')
      return
    }

    const signedAmount = adjustType === 'admin_subtract' ? -amountValue : amountValue
    const selectedUser = users.find((user) => user.id === selectedUserID)

    setAdjustBusy(true)
    try {
      await apiJson(`/admin/users/${selectedUserID}/credits/adjust`, {
        method: 'POST',
        body: JSON.stringify({
          amount: signedAmount,
          type: adjustType,
          reason: adjustReason.trim(),
        }),
      })

      setAdjustOpen(false)
      setMessage(
        `${adjustType === 'admin_subtract' ? 'Pengurangan' : 'Penambahan'} ${amountValue} kredit untuk ${selectedUser?.name ?? 'user'} berhasil.`
      )
      await loadTransactions()
      await loadUsers()
    } catch (err) {
      setAdjustError(err instanceof Error ? err.message : 'Gagal membuat transaksi kredit.')
    } finally {
      setAdjustBusy(false)
    }
  }

  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap items-start justify-between gap-4'>
        <div>
          <h1 className='text-2xl font-semibold'>Credit Management</h1>
          <p className='mt-1 text-sm text-muted-foreground'>Ledger Kredit seluruh user.</p>
        </div>
        <Button onClick={openAdjustModal}>Transaksi Kredit</Button>
      </div>
      {message ? <p className='rounded-md bg-primary/10 p-3 text-sm text-primary'>{message}</p> : null}
      <div className='rounded-lg border bg-card shadow-sm'>
        {error ? <p className='m-5 rounded-md bg-destructive/10 p-3 text-sm text-destructive'>{error}</p> : null}
        {transactions.length === 0 ? <p className='p-5 text-sm text-muted-foreground'>Belum ada transaksi.</p> : null}
        {transactions.length > 0 ? (
          <>
          <div className='divide-y md:hidden'>
            {transactions.map((transaction) => (
              <div className='space-y-3 p-4' key={transaction.id}>
                <div className='flex items-start justify-between gap-3'>
                  <div className='min-w-0'>
                    <p className='font-semibold'>{transaction.user_name || transaction.user_id}</p>
                    <p className='text-sm text-muted-foreground'>{formatIndonesianDateTime(transaction.created_at)} WIB</p>
                  </div>
                  <p className={`shrink-0 font-semibold ${transaction.amount < 0 ? 'text-destructive' : 'text-primary'}`}>
                    {transaction.amount > 0 ? `+${transaction.amount}` : transaction.amount}
                  </p>
                </div>
                <div className='grid grid-cols-2 gap-3 text-sm'>
                  <div>
                    <p className='text-xs text-muted-foreground'>Tipe</p>
                    <p>{transaction.type}</p>
                  </div>
                  <div>
                    <p className='text-xs text-muted-foreground'>Status</p>
                    <Badge variant='secondary'>{transaction.status}</Badge>
                  </div>
                </div>
                <div>
                  <p className='text-xs text-muted-foreground'>Alasan</p>
                  <p className='break-words text-sm'>{transaction.reason || '-'}</p>
                </div>
              </div>
            ))}
          </div>
          <div className='hidden md:block'>
            <table className='w-full text-sm'>
              <thead className='bg-muted/40 text-left text-xs uppercase text-muted-foreground'>
                <tr>
                  <th className='px-5 py-3'>Tanggal</th>
                  <th className='px-5 py-3'>User</th>
                  <th className='px-5 py-3'>Tipe</th>
                  <th className='px-5 py-3'>Status</th>
                  <th className='px-5 py-3'>Jumlah</th>
                  <th className='px-5 py-3'>Alasan</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr className='border-t' key={transaction.id}>
                    <td className='px-5 py-3'>{formatIndonesianDateTime(transaction.created_at)} WIB</td>
                    <td className='px-5 py-3'>{transaction.user_name || transaction.user_id}</td>
                    <td className='px-5 py-3'>{transaction.type}</td>
                    <td className='px-5 py-3'><Badge variant='secondary'>{transaction.status}</Badge></td>
                    <td className={`px-5 py-3 font-semibold ${transaction.amount < 0 ? 'text-destructive' : 'text-primary'}`}>
                      {transaction.amount > 0 ? `+${transaction.amount}` : transaction.amount}
                    </td>
                    <td className='px-5 py-3 text-muted-foreground'>{transaction.reason || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        ) : null}
      </div>

      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent className='max-w-xl'>
          <DialogHeader>
            <DialogTitle>Transaksi Kredit</DialogTitle>
            <DialogDescription className='font-normal text-muted-foreground'>
              Tambahkan atau kurangi kredit user. Setiap perubahan akan tercatat sebagai transaksi admin.
            </DialogDescription>
          </DialogHeader>

          <form className='space-y-4' onSubmit={handleAdjustCredit}>
            <div className='space-y-2'>
              <Label>User</Label>
              <Select value={selectedUserID} onValueChange={setSelectedUserID}>
                <SelectTrigger className='w-full'><SelectValue placeholder='Pilih user' /></SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} - {user.email} ({user.credit_balance} kredit)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='grid gap-4 md:grid-cols-2'>
              <div className='space-y-2'>
                <Label>Tipe Transaksi</Label>
                <Select value={adjustType} onValueChange={setAdjustType}>
                  <SelectTrigger className='w-full'><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value='admin_add'>Tambah Kredit</SelectItem>
                    <SelectItem value='admin_subtract'>Kurangi Kredit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className='space-y-2'>
                <Label htmlFor='adjust-amount'>Jumlah Kredit</Label>
                <Input
                  id='adjust-amount'
                  min={1}
                  type='number'
                  value={adjustAmount}
                  onChange={(event) => setAdjustAmount(event.target.value)}
                />
              </div>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='adjust-reason'>Alasan</Label>
              <Textarea
                id='adjust-reason'
                placeholder='Contoh: Top up paket bulanan atau koreksi saldo.'
                rows={3}
                value={adjustReason}
                onChange={(event) => setAdjustReason(event.target.value)}
              />
            </div>

            {adjustError ? <p className='rounded-md bg-destructive/10 p-3 text-sm text-destructive'>{adjustError}</p> : null}

            <DialogFooter>
              <DialogClose asChild>
                <Button disabled={adjustBusy} type='button' variant='outline'>Batal</Button>
              </DialogClose>
              <Button disabled={adjustBusy} type='submit'>
                {adjustBusy ? 'Menyimpan...' : 'Simpan Transaksi'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
