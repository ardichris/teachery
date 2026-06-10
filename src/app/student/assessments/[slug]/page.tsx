'use client'

import { useParams } from 'next/navigation'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'

type PublicOption = {
  id: string
  label: string
  text: string
}

type PublicQuestion = {
  id: string
  number: number
  type: string
  prompt: string
  image_url?: string | null
  answer_options: PublicOption[]
}

type PublicAssessment = {
  id: string
  title: string
  subject: string
  grade: string
  questions: PublicQuestion[]
}

type ApiSuccess<T> = {
  data: T
}

type SubmitResult = {
  id: string
  score: number
  total_questions: number
  scored_questions: number
  submitted_at: string
}

async function publicApi<T>(path: string, init?: RequestInit) {
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
  const payload = await response.json().catch(() => ({}))

  if (!response.ok || 'error' in payload) {
    const message = payload?.error?.message || 'Request gagal diproses.'
    throw new Error(message)
  }

  return payload as ApiSuccess<T>
}

export default function StudentAssessmentPage() {
  const params = useParams<{ slug: string }>()
  const slug = params.slug
  const [assessment, setAssessment] = useState<PublicAssessment | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [studentName, setStudentName] = useState('')
  const [studentIdentifier, setStudentIdentifier] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<SubmitResult | null>(null)

  const unansweredCount = useMemo(() => {
    if (!assessment) return 0
    return assessment.questions.filter((question) => !answers[question.id]?.trim()).length
  }, [answers, assessment])

  useEffect(() => {
    let alive = true

    async function loadAssessment() {
      setLoading(true)
      setError('')

      try {
        const res = await publicApi<PublicAssessment>(`/public/assessments/${slug}`)
        if (!alive) return
        setAssessment(res.data)
      } catch (err) {
        if (!alive) return
        setError(err instanceof Error ? err.message : 'Assessment tidak dapat dimuat.')
      } finally {
        if (alive) setLoading(false)
      }
    }

    if (slug) void loadAssessment()

    return () => {
      alive = false
    }
  }, [slug])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!assessment) return

    setError('')
    setResult(null)

    if (!studentName.trim()) {
      setError('Nama siswa wajib diisi.')
      return
    }

    if (unansweredCount > 0) {
      setError('Semua soal wajib dijawab sebelum dikirim.')
      return
    }

    setSubmitting(true)

    try {
      const res = await publicApi<SubmitResult>(`/public/assessments/${slug}/submissions`, {
        method: 'POST',
        body: JSON.stringify({
          student_name: studentName.trim(),
          student_identifier: studentIdentifier.trim(),
          answers: assessment.questions.map((question) => ({
            question_id: question.id,
            answer: answers[question.id] ?? '',
          })),
        }),
      })
      setResult(res.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Jawaban gagal dikirim.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <main className='min-h-screen bg-muted/20 px-4 py-8'>
        <div className='mx-auto max-w-3xl rounded-lg border bg-card p-6 text-sm text-muted-foreground shadow-sm'>
          Memuat assessment...
        </div>
      </main>
    )
  }

  if (error && !assessment) {
    return (
      <main className='min-h-screen bg-muted/20 px-4 py-8'>
        <div className='mx-auto max-w-3xl rounded-lg border bg-card p-6 shadow-sm'>
          <h1 className='text-xl font-semibold'>Assessment tidak tersedia</h1>
          <p className='mt-2 text-sm text-destructive'>{error}</p>
        </div>
      </main>
    )
  }

  return (
    <main className='min-h-screen bg-muted/20 px-4 py-8'>
      <form className='mx-auto max-w-3xl space-y-5' onSubmit={handleSubmit}>
        <section className='rounded-lg border bg-card p-5 shadow-sm'>
          <p className='text-sm font-medium text-primary'>Teachery Assessment</p>
          <h1 className='mt-1 text-2xl font-semibold text-foreground'>{assessment?.title}</h1>
          <p className='mt-1 text-sm text-muted-foreground'>
            {assessment?.subject} - {assessment?.grade}
          </p>
        </section>

        <section className='grid gap-4 rounded-lg border bg-card p-5 shadow-sm md:grid-cols-2'>
          <div className='space-y-2'>
            <Label htmlFor='student-name'>Nama Siswa</Label>
            <Input
              id='student-name'
              value={studentName}
              onChange={(event) => setStudentName(event.target.value)}
            />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='student-identifier'>Kelas / Nomor Absen</Label>
            <Input
              id='student-identifier'
              value={studentIdentifier}
              onChange={(event) => setStudentIdentifier(event.target.value)}
            />
          </div>
        </section>

        {assessment?.questions.map((question) => (
          <Card key={question.id}>
            <CardHeader>
              <CardTitle>Soal {question.number}</CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <p className='whitespace-pre-wrap leading-relaxed'>{question.prompt}</p>

              {question.image_url ? (
                <div className='overflow-hidden rounded-md border bg-white'>
                  <img
                    alt={`Ilustrasi soal ${question.number}`}
                    className='h-auto max-h-[420px] w-full object-contain'
                    src={question.image_url}
                  />
                </div>
              ) : null}

              {question.type === 'multiple_choice' ? (
                <RadioGroup
                  value={answers[question.id] ?? ''}
                  onValueChange={(value) => setAnswers((current) => ({ ...current, [question.id]: value }))}>
                  {question.answer_options.map((option) => {
                    const isSelected = answers[question.id] === option.label

                    return (
                      <label
                        className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm transition-colors ${
                          isSelected
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'hover:bg-muted/40'
                        }`}
                        key={option.id}>
                        <RadioGroupItem
                          className={`mt-1 ${
                            isSelected
                              ? 'border-primary-foreground text-primary-foreground data-checked:border-primary-foreground data-checked:bg-primary-foreground [&_span]:bg-primary'
                              : ''
                          }`}
                          value={option.label}
                        />
                        <span>
                          <span className='font-semibold'>{option.label}.</span> {option.text}
                        </span>
                      </label>
                    )
                  })}
                </RadioGroup>
              ) : (
                <Textarea
                  rows={5}
                  value={answers[question.id] ?? ''}
                  onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))}
                />
              )}
            </CardContent>
          </Card>
        ))}

        {error ? <p className='rounded-md bg-destructive/10 p-3 text-sm text-destructive'>{error}</p> : null}

        {result ? (
          <div className='rounded-lg border bg-primary/10 p-5 text-sm text-primary'>
            Jawaban berhasil dikirim. Skor pilihan ganda: {result.score}/{result.scored_questions}.
          </div>
        ) : (
          <div className='flex flex-col gap-3 rounded-lg border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between'>
            <p className='text-sm text-muted-foreground'>
              {unansweredCount > 0 ? `${unansweredCount} soal belum dijawab.` : 'Semua soal sudah dijawab.'}
            </p>
            <Button disabled={submitting} type='submit'>
              {submitting ? 'Mengirim...' : 'Kirim Jawaban'}
            </Button>
          </div>
        )}
      </form>
    </main>
  )
}
