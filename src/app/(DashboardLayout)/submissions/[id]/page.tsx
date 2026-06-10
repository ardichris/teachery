'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { apiJson } from '@/lib/teachery-api'

type ReviewAssessment = {
  id: string
  title: string
  subject: string
  grade: string
  status: string
}

type SubmissionAnswer = {
  question_id: string
  question_number: number
  question_type: string
  question_prompt: string
  submitted_answer: string
  submitted_answer_text: string
  correct_answer: string
  is_correct: boolean | null
}

type StudentSubmission = {
  id: string
  student_name: string
  student_identifier: string
  score: number
  total_questions: number
  scored_questions: number
  submitted_at: string
  answers: SubmissionAnswer[]
}

type ReviewResponse = {
  assessment: ReviewAssessment
  submissions: StudentSubmission[]
}

function formatDateTime(value: string) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(value))
}

export default function AssessmentSubmissionsPage() {
  const params = useParams<{ id: string }>()
  const [assessment, setAssessment] = useState<ReviewAssessment | null>(null)
  const [submissions, setSubmissions] = useState<StudentSubmission[]>([])
  const [selectedID, setSelectedID] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [reviewBusyKey, setReviewBusyKey] = useState('')
  const [recalculateBusy, setRecalculateBusy] = useState(false)

  const selectedSubmission = useMemo(
    () => submissions.find((submission) => submission.id === selectedID) ?? submissions[0] ?? null,
    [selectedID, submissions]
  )

  const loadSubmissions = useCallback(async (options: { showLoading?: boolean } = {}) => {
    const showLoading = options.showLoading ?? true
    if (!params.id) return

    if (showLoading) setLoading(true)
    setError('')

    try {
      const res = await apiJson<ReviewResponse>(`/assessments/${params.id}/submissions`)

      setAssessment(res.data.assessment)
      setSubmissions(res.data.submissions)
      setSelectedID((current) =>
        current && res.data.submissions.some((submission) => submission.id === current)
          ? current
          : res.data.submissions[0]?.id || ''
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat jawaban siswa.')
    } finally {
      if (showLoading) setLoading(false)
    }
  }, [params.id])

  useEffect(() => {
    void loadSubmissions()
  }, [loadSubmissions])

  async function handleRecalculateAll() {
    setRecalculateBusy(true)
    setError('')
    setMessage('')

    try {
      const res = await apiJson<{ success: boolean; recalculated_submissions: number }>(
        `/assessments/${params.id}/submissions/recalculate`,
        { method: 'POST' }
      )

      await loadSubmissions({ showLoading: false })
      setMessage(`${res.data.recalculated_submissions} jawaban siswa berhasil dikoreksi ulang.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengoreksi ulang jawaban siswa.')
    } finally {
      setRecalculateBusy(false)
    }
  }

  async function handleReviewEssay(
    submission: StudentSubmission,
    answer: SubmissionAnswer,
    isCorrect: boolean
  ) {
    const key = `${submission.id}:${answer.question_id}`
    setReviewBusyKey(key)
    setError('')
    setMessage('')

    try {
      const res = await apiJson<{ success: boolean; score: number; scored_questions: number }>(
        `/assessments/${params.id}/submissions/${submission.id}/answers/${answer.question_id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ is_correct: isCorrect }),
        }
      )

      setSubmissions((current) =>
        current.map((item) => {
          if (item.id !== submission.id) return item

          return {
            ...item,
            score: res.data.score,
            scored_questions: res.data.scored_questions,
            answers: item.answers.map((itemAnswer) =>
              itemAnswer.question_id === answer.question_id
                ? { ...itemAnswer, is_correct: isCorrect }
                : itemAnswer
            ),
          }
        })
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mereview jawaban essay.')
    } finally {
      setReviewBusyKey('')
    }
  }

  if (loading) {
    return <p className='text-sm text-muted-foreground'>Memuat jawaban siswa...</p>
  }

  if (error && !assessment) {
    return (
      <div className='space-y-4'>
        <Button asChild variant='outline'>
          <Link href={`/assessments/${params.id}`}>Kembali</Link>
        </Button>
        <p className='rounded-md bg-destructive/10 p-3 text-sm text-destructive'>{error}</p>
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap items-start justify-between gap-4'>
        <div>
          <p className='text-sm font-medium text-primary'>Review Jawaban</p>
          <h1 className='mt-1 text-2xl font-semibold'>{assessment?.title}</h1>
          <p className='mt-1 text-sm text-muted-foreground'>
            {assessment?.subject} - {assessment?.grade}
          </p>
        </div>
        <div className='flex flex-wrap gap-2'>
          <Button
            disabled={recalculateBusy || submissions.length === 0}
            type='button'
            onClick={() => void handleRecalculateAll()}>
            <RefreshCw className={`mr-2 h-4 w-4 ${recalculateBusy ? 'animate-spin' : ''}`} />
            {recalculateBusy ? 'Mengoreksi...' : 'Koreksi Ulang Semua'}
          </Button>
          <Button asChild variant='outline'>
            <Link href={`/assessments/${params.id}`}>Kembali ke Assessment</Link>
          </Button>
        </div>
      </div>

      {message ? (
        <p className='rounded-md bg-emerald-50 p-3 text-sm text-emerald-700'>{message}</p>
      ) : null}

      {error ? <p className='rounded-md bg-destructive/10 p-3 text-sm text-destructive'>{error}</p> : null}

      {submissions.length === 0 ? (
        <Card>
          <CardContent className='py-8 text-center'>
            <h2 className='text-lg font-semibold'>Belum ada jawaban siswa</h2>
            <p className='mt-2 text-sm text-muted-foreground'>
              Jawaban akan muncul setelah siswa mengirim assessment melalui public link.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className='grid gap-5 lg:grid-cols-[320px_1fr]'>
          <div className='space-y-3'>
            {submissions.map((submission) => {
              const isSelected = selectedSubmission?.id === submission.id

              return (
                <button
                  className={`w-full rounded-lg border p-4 text-left text-sm transition-colors ${
                    isSelected ? 'border-primary bg-primary/10' : 'bg-card hover:bg-muted/40'
                  }`}
                  key={submission.id}
                  type='button'
                  onClick={() => setSelectedID(submission.id)}>
                  <div className='flex items-start justify-between gap-3'>
                    <div className='min-w-0'>
                      <p className='truncate font-semibold text-foreground'>{submission.student_name}</p>
                      <p className='mt-1 text-muted-foreground'>
                        {submission.student_identifier || 'Tanpa kelas/absen'}
                      </p>
                    </div>
                    <Badge variant='secondary'>
                      {submission.score}/{submission.scored_questions}
                    </Badge>
                  </div>
                  <p className='mt-3 text-xs text-muted-foreground'>{formatDateTime(submission.submitted_at)}</p>
                </button>
              )
            })}
          </div>

          <Card>
            <CardHeader>
              <div className='flex flex-wrap items-start justify-between gap-3'>
                <div>
                  <CardTitle>{selectedSubmission?.student_name}</CardTitle>
                  <p className='mt-1 text-sm text-muted-foreground'>
                    {selectedSubmission?.student_identifier || 'Tanpa kelas/absen'} - {formatDateTime(selectedSubmission?.submitted_at ?? '')}
                  </p>
                </div>
                <Badge variant='secondary'>
                  Skor {selectedSubmission?.score}/{selectedSubmission?.scored_questions}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className='space-y-4'>
              {selectedSubmission?.answers.map((answer) => (
                <div className='rounded-lg border p-4' key={`${selectedSubmission.id}-${answer.question_id}`}>
                  <div className='flex flex-wrap items-center justify-between gap-2'>
                    <p className='font-semibold'>Soal {answer.question_number || '-'}</p>
                    {answer.question_type === 'essay' && answer.is_correct === null ? (
                      <Badge variant='outline'>Belum Dinilai</Badge>
                    ) : answer.is_correct ? (
                      <Badge className='bg-emerald-600 text-white'>Benar</Badge>
                    ) : (
                      <Badge variant='destructive'>Salah</Badge>
                    )}
                  </div>

                  <p className='mt-3 whitespace-pre-wrap text-sm leading-relaxed'>{answer.question_prompt}</p>

                  <div className='mt-4 grid gap-3 text-sm md:grid-cols-2'>
                    <div className='rounded-md bg-muted/40 p-3'>
                      <p className='text-xs font-medium uppercase text-muted-foreground'>Jawaban Siswa</p>
                      <p className='mt-1 font-medium'>
                        {answer.submitted_answer}
                        {answer.submitted_answer_text && answer.submitted_answer_text !== answer.submitted_answer
                          ? `. ${answer.submitted_answer_text}`
                          : ''}
                      </p>
                    </div>

                    {answer.question_type === 'essay' ? (
                      <div className='rounded-md bg-muted/40 p-3'>
                        <p className='text-xs font-medium uppercase text-muted-foreground'>Review Guru</p>
                        <div className='mt-2 flex flex-wrap gap-2'>
                          <Button
                            disabled={reviewBusyKey === `${selectedSubmission.id}:${answer.question_id}`}
                            size='sm'
                            type='button'
                            className='bg-emerald-600 text-white hover:bg-emerald-700'
                            onClick={() => void handleReviewEssay(selectedSubmission, answer, true)}>
                            Benar
                          </Button>
                          <Button
                            disabled={reviewBusyKey === `${selectedSubmission.id}:${answer.question_id}`}
                            size='sm'
                            type='button'
                            variant='error'
                            onClick={() => void handleReviewEssay(selectedSubmission, answer, false)}>
                            Salah
                          </Button>
                        </div>
                      </div>
                    ) : answer.is_correct !== null ? (
                      <div className='rounded-md bg-muted/40 p-3'>
                        <p className='text-xs font-medium uppercase text-muted-foreground'>Kunci Jawaban</p>
                        <p className='mt-1 font-medium'>{answer.correct_answer || '-'}</p>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
