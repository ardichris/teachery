'use client'

import { useEffect, useState } from 'react'
import { apiJson } from '@/lib/teachery-api'
import { Badge } from '@/components/ui/badge'

type CreditBalance = {
  balance: number
  updated_at: string
}

type CreditTransaction = {
  id: string
  amount: number
  type: string
  status: string
  reason?: string
  created_at: string
}

export default function CreditsPage() {
  const [balance, setBalance] = useState<CreditBalance | null>(null)
  const [transactions, setTransactions] = useState<CreditTransaction[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      apiJson<CreditBalance>('/me/credit-balance'),
      apiJson<CreditTransaction[]>('/me/credit-transactions'),
    ])
      .then(([balanceRes, transactionRes]) => {
        setBalance(balanceRes.data)
        setTransactions(transactionRes.data)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Gagal memuat Kredit.'))
  }, [])

  return (
    <div className='space-y-6'>
      <div className='grid gap-4 md:grid-cols-3'>
        <div className='rounded-lg border bg-card p-5 shadow-sm'>
          <p className='text-sm font-medium text-muted-foreground'>Saldo Kredit</p>
          <p className='mt-3 text-3xl font-bold'>{balance?.balance ?? '-'}</p>
          <p className='mt-2 text-sm text-muted-foreground'>
            AI memakai Kredit saat soal berhasil dibuat.
          </p>
        </div>
      </div>
      <div className='rounded-lg border bg-card shadow-sm'>
        <div className='border-b p-5'>
          <h1 className='text-xl font-semibold'>Riwayat Kredit</h1>
        </div>
        {error ? <p className='m-5 rounded-md bg-destructive/10 p-3 text-sm text-destructive'>{error}</p> : null}
        {transactions.length === 0 ? <p className='p-5 text-sm text-muted-foreground'>Belum ada transaksi.</p> : null}
        {transactions.length > 0 ? (
          <>
          <div className='divide-y md:hidden'>
            {transactions.map((transaction) => (
              <div className='space-y-3 p-4' key={transaction.id}>
                <div className='flex items-start justify-between gap-3'>
                  <div className='min-w-0'>
                    <p className='font-semibold'>{transaction.type}</p>
                    <p className='text-sm text-muted-foreground'>{transaction.created_at}</p>
                  </div>
                  <p className={`shrink-0 font-semibold ${transaction.amount < 0 ? 'text-destructive' : 'text-primary'}`}>
                    {transaction.amount > 0 ? `+${transaction.amount}` : transaction.amount}
                  </p>
                </div>
                <div className='grid grid-cols-1 gap-3 text-sm'>
                  <div>
                    <p className='text-xs text-muted-foreground'>Status</p>
                    <Badge variant='secondary'>{transaction.status}</Badge>
                  </div>
                  <div>
                    <p className='text-xs text-muted-foreground'>Alasan</p>
                    <p className='break-words'>{transaction.reason || '-'}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className='hidden md:block'>
            <table className='w-full text-sm'>
              <thead className='bg-muted/40 text-left text-xs uppercase text-muted-foreground'>
                <tr>
                  <th className='px-5 py-3'>Tanggal</th>
                  <th className='px-5 py-3'>Tipe</th>
                  <th className='px-5 py-3'>Status</th>
                  <th className='px-5 py-3'>Jumlah</th>
                  <th className='px-5 py-3'>Alasan</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr className='border-t' key={transaction.id}>
                    <td className='px-5 py-3'>{transaction.created_at}</td>
                    <td className='px-5 py-3'>{transaction.type}</td>
                    <td className='px-5 py-3'><Badge variant='secondary'>{transaction.status}</Badge></td>
                    <td className='px-5 py-3 font-semibold'>{transaction.amount}</td>
                    <td className='px-5 py-3'>{transaction.reason || '-'}</td>
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
