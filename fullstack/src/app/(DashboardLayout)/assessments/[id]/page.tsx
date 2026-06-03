'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { apiFetch } from '@/lib/api'
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

type AnswerOption = {
  id?: string
  label: string
  text: string
  is_correct: boolean
}

type Question = {
  id: string
  number: number
  type: string
  difficulty: string
  prompt: string
  explanation?: string
  image_url?: string
  correct_answer?: string
  answer_options: AnswerOption[]
  blueprint_item?: string
}

type AssessmentDetail = {
  id: string
  title: string
  subject: string
  grade: string
  status: string
  questions: Question[]
}

type JobResult = {
  id: string
  status: string
  estimated_credit: number
  actual_credit: number
}

type GenerateExplanationResult = {
  job: JobResult
  explanation: string
}

const defaultOptions: AnswerOption[] = [
  { label: 'A', text: '', is_correct: true },
  { label: 'B', text: '', is_correct: false },
  { label: 'C', text: '', is_correct: false },
  { label: 'D', text: '', is_correct: false },
]

async function extractMaterialText(file: File) {
  const buffer = await file.arrayBuffer()
  const isPDF = file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
  const isDOCX =
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    /\.docx$/i.test(file.name)

  if (isPDF) {
    const { extractText, getDocumentProxy } = await import('unpdf')
    const pdf = await getDocumentProxy(new Uint8Array(buffer))
    const result = await extractText(pdf, { mergePages: true })
    const text = Array.isArray(result.text) ? result.text.join('\n\n') : result.text

    return normalizeExtractedText(text)
  }

  if (isDOCX) {
    const mammoth = await import('mammoth')
    const result = await mammoth.extractRawText({ arrayBuffer: buffer })

    return normalizeExtractedText(result.value)
  }

  throw new Error('Format materi tidak didukung. Gunakan PDF atau DOCX.')
}

function normalizeExtractedText(text: string) {
  return text.replace(/\s+/g, ' ').trim()
}

function escapeHTML(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function safeDownloadName(value: string) {
  return value.trim().replace(/[^a-z0-9-_]+/gi, '-').replace(/^-+|-+$/g, '') || 'assessment'
}

export default function AssessmentDetailPage() {
  const params = useParams<{ id: string }>()
  const [assessment, setAssessment] = useState<AssessmentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [exportOpen, setExportOpen] = useState(false)
  const [exportBusy, setExportBusy] = useState<'pdf' | 'doc' | ''>('')
  const [includeBlueprint, setIncludeBlueprint] = useState(true)
  const [includeQuestions, setIncludeQuestions] = useState(true)
  const [includeAnswerSection, setIncludeAnswerSection] = useState(true)
  const [exportError, setExportError] = useState('')
  const [deleteQuestion, setDeleteQuestion] = useState<Question | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const [manualOpen, setManualOpen] = useState(false)
  const [manualBusy, setManualBusy] = useState(false)
  const [manualError, setManualError] = useState('')
  const [manualNumber, setManualNumber] = useState('1')
  const [manualType, setManualType] = useState('multiple_choice')
  const [manualDifficulty, setManualDifficulty] = useState('medium')
  const [manualPrompt, setManualPrompt] = useState('')
  const [manualImageURL, setManualImageURL] = useState('')
  const [manualCorrectAnswer, setManualCorrectAnswer] = useState('')
  const [manualExplanation, setManualExplanation] = useState('')
  const [manualOptions, setManualOptions] = useState(defaultOptions)

  const [editQuestion, setEditQuestion] = useState<Question | null>(null)
  const [editBusy, setEditBusy] = useState(false)
  const [editError, setEditError] = useState('')
  const [editNumber, setEditNumber] = useState('1')
  const [editType, setEditType] = useState('multiple_choice')
  const [editDifficulty, setEditDifficulty] = useState('medium')
  const [editPrompt, setEditPrompt] = useState('')
  const [editImageURL, setEditImageURL] = useState('')
  const [editCorrectAnswer, setEditCorrectAnswer] = useState('')
  const [editExplanation, setEditExplanation] = useState('')
  const [editBlueprintItem, setEditBlueprintItem] = useState('')
  const [editOptions, setEditOptions] = useState(defaultOptions)
  const [editExplanationBusy, setEditExplanationBusy] = useState(false)

  const [generateOpen, setGenerateOpen] = useState(false)
  const [generateBusy, setGenerateBusy] = useState(false)
  const [generateError, setGenerateError] = useState('')
  const [generateType, setGenerateType] = useState('multiple_choice')
  const [generateCount, setGenerateCount] = useState('5')
  const [generateDifficulty, setGenerateDifficulty] = useState('mixed')
  const [generateMaterial, setGenerateMaterial] = useState('')
  const [generateMaterialFilename, setGenerateMaterialFilename] = useState('')
  const [generateExtractBusy, setGenerateExtractBusy] = useState(false)
  const [generateBlueprint, setGenerateBlueprint] = useState('')

  async function loadAssessment() {
    setLoading(true)
    setError('')

    try {
      const res = await apiJson<AssessmentDetail>(`/assessments/${params.id}`)
      setAssessment(res.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat assessment.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadAssessment()
  }, [params.id])

  function nextQuestionNumber() {
    if (!assessment || assessment.questions.length === 0) return 1
    return Math.max(...assessment.questions.map((question) => question.number)) + 1
  }

  function openManualModal() {
    setManualNumber(String(nextQuestionNumber()))
    setManualType('multiple_choice')
    setManualDifficulty('medium')
    setManualPrompt('')
    setManualImageURL('')
    setManualCorrectAnswer('')
    setManualExplanation('')
    setManualOptions(defaultOptions.map((option) => ({ ...option })))
    setManualError('')
    setManualOpen(true)
  }

  function normalizeQuestionOptions(question: Question) {
    const options = question.answer_options.length > 0 ? question.answer_options : defaultOptions
    const normalized = options.map((option, index) => ({
      id: option.id,
      label: option.label || String.fromCharCode(65 + index),
      text: option.text || '',
      is_correct: option.is_correct,
    }))

    if (normalized.length > 0 && !normalized.some((option) => option.is_correct)) {
      normalized[0].is_correct = true
    }

    return normalized
  }

  function openEditModal(question: Question) {
    setEditQuestion(question)
    setEditNumber(String(question.number))
    setEditType(question.type)
    setEditDifficulty(question.difficulty)
    setEditPrompt(question.prompt)
    setEditImageURL(question.image_url ?? '')
    setEditCorrectAnswer(question.correct_answer ?? '')
    setEditExplanation(question.explanation ?? '')
    setEditBlueprintItem(question.blueprint_item ?? '')
    setEditOptions(normalizeQuestionOptions(question))
    setEditExplanationBusy(false)
    setEditError('')
  }

  function openGenerateModal() {
    setGenerateType('multiple_choice')
    setGenerateCount('5')
    setGenerateDifficulty('mixed')
    setGenerateMaterial('')
    setGenerateMaterialFilename('')
    setGenerateExtractBusy(false)
    setGenerateBlueprint('')
    setGenerateError('')
    setGenerateOpen(true)
  }

  async function handleMaterialFileChange(file: File | null) {
    setGenerateError('')
    setGenerateMaterialFilename('')

    if (!file) return
    if (!['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.type) && !/\.(pdf|docx)$/i.test(file.name)) {
      setGenerateError('Format materi tidak didukung. Gunakan PDF atau DOCX.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setGenerateError('Ukuran materi terlalu besar. Maksimal 10MB.')
      return
    }

    setGenerateExtractBusy(true)

    try {
      const extractedText = await extractMaterialText(file)

      if (!extractedText) {
        throw new Error('Materi tidak memiliki teks yang dapat dibaca.')
      }

      setGenerateMaterial(extractedText)
      setGenerateMaterialFilename(file.name)
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : 'Materi tidak dapat diekstrak.')
    } finally {
      setGenerateExtractBusy(false)
    }
  }

  async function handleManualSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setManualError('')
    setMessage('')
    if (!assessment) return

    const number = Number.parseInt(manualNumber, 10)
    if (!number || number < 1) {
      setManualError('Nomor soal harus lebih dari 0.')
      return
    }
    if (!manualPrompt.trim()) {
      setManualError('Pertanyaan wajib diisi.')
      return
    }
    if (manualType === 'multiple_choice' && manualOptions.some((option) => !option.text.trim())) {
      setManualError('Semua opsi pilihan ganda wajib diisi.')
      return
    }

    setManualBusy(true)
    try {
      await apiJson<Question>(`/assessments/${assessment.id}/questions`, {
        method: 'POST',
        body: JSON.stringify({
          number,
          type: manualType,
          difficulty: manualDifficulty,
          prompt: manualPrompt.trim(),
          image_url: manualImageURL.trim(),
          correct_answer: manualType === 'essay' ? manualCorrectAnswer.trim() : '',
          explanation: manualExplanation.trim(),
          answer_options:
            manualType === 'multiple_choice'
              ? manualOptions.map((option) => ({
                  label: option.label,
                  text: option.text.trim(),
                  is_correct: option.is_correct,
                }))
              : [],
        }),
      })

      setManualOpen(false)
      setMessage('Soal manual berhasil ditambahkan.')
      await loadAssessment()
    } catch (err) {
      setManualError(err instanceof Error ? err.message : 'Gagal menambahkan soal.')
    } finally {
      setManualBusy(false)
    }
  }

  async function handleEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setEditError('')
    setMessage('')
    if (!assessment || !editQuestion) return

    const number = Number.parseInt(editNumber, 10)
    if (!number || number < 1) {
      setEditError('Nomor soal harus lebih dari 0.')
      return
    }
    if (!editPrompt.trim()) {
      setEditError('Pertanyaan wajib diisi.')
      return
    }
    if (editType === 'multiple_choice' && editOptions.some((option) => !option.text.trim())) {
      setEditError('Semua opsi pilihan ganda wajib diisi.')
      return
    }

    const correctOption = editOptions.find((option) => option.is_correct)
    if (editType === 'multiple_choice' && !correctOption) {
      setEditError('Pilih satu jawaban benar.')
      return
    }

    setEditBusy(true)
    try {
      await apiJson<Question>(`/assessments/${assessment.id}/questions/${editQuestion.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          id: editQuestion.id,
          assessment_id: assessment.id,
          number,
          type: editType,
          difficulty: editDifficulty,
          prompt: editPrompt.trim(),
          image_url: editImageURL.trim(),
          correct_answer: editType === 'essay' ? editCorrectAnswer.trim() : correctOption?.label ?? '',
          explanation: editExplanation.trim(),
          blueprint_item: editBlueprintItem.trim(),
          answer_options:
            editType === 'multiple_choice'
              ? editOptions.map((option) => ({
                  id: option.id,
                  label: option.label,
                  text: option.text.trim(),
                  is_correct: option.is_correct,
                }))
              : [],
        }),
      })

      setEditQuestion(null)
      setMessage(`Soal nomor ${number} berhasil diperbarui.`)
      await loadAssessment()
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Gagal memperbarui soal.')
    } finally {
      setEditBusy(false)
    }
  }

  async function handleGenerateExplanation() {
    setEditError('')
    setMessage('')
    if (!assessment || !editQuestion) return
    if (!editPrompt.trim()) {
      setEditError('Pertanyaan wajib diisi sebelum generate pembahasan.')
      return
    }

    setEditExplanationBusy(true)
    try {
      const res = await apiJson<GenerateExplanationResult>(
        `/assessments/${assessment.id}/questions/${editQuestion.id}/explanation`,
        {
          method: 'POST',
          body: JSON.stringify({ question_text: editPrompt.trim() }),
        }
      )

      setEditExplanation(res.data.explanation)
      setMessage(
        `Pembahasan berhasil dibuat dengan AI. Kredit terpakai: ${res.data.job.actual_credit || res.data.job.estimated_credit}.`
      )
      await loadAssessment()
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Gagal generate pembahasan.')
    } finally {
      setEditExplanationBusy(false)
    }
  }

  async function handleGenerateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setGenerateError('')
    setMessage('')
    if (!assessment) return

    const questionCount = Number.parseInt(generateCount, 10)
    if (!questionCount || questionCount < 1) {
      setGenerateError('Jumlah soal harus lebih dari 0.')
      return
    }
    if (!generateMaterial.trim()) {
      setGenerateError('Materi pembelajaran wajib diisi untuk generate AI.')
      return
    }

    setGenerateBusy(true)
    try {
      const res = await apiJson<JobResult>('/jobs', {
        method: 'POST',
        body: JSON.stringify({
          type: 'generate_questions',
          input: {
            assessment_id: assessment.id,
            creation_mode: 'ai',
            subject: assessment.subject,
            grade: assessment.grade,
            material_text: generateMaterial.trim(),
            question_type: generateType,
            question_count: questionCount,
            difficulty: generateDifficulty,
            include_explanation: false,
            blueprint: generateBlueprint.trim(),
          },
        }),
      })

      setGenerateOpen(false)
      setMessage(
        `Generate soal selesai. Kredit terpakai: ${res.data.actual_credit || res.data.estimated_credit}.`
      )
      await loadAssessment()
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : 'Gagal generate soal.')
    } finally {
      setGenerateBusy(false)
    }
  }

  function openExportModal() {
    setExportError('')
    setIncludeBlueprint(true)
    setIncludeQuestions(true)
    setIncludeAnswerSection(true)
    setExportOpen(true)
  }

  function selectedExportQuery() {
    return new URLSearchParams({
      blueprint: includeBlueprint ? '1' : '0',
      questions: includeQuestions ? '1' : '0',
      answer_key: includeAnswerSection ? '1' : '0',
      explanation: includeAnswerSection ? '1' : '0',
    }).toString()
  }

  function validateExportSelection() {
    if (includeBlueprint || includeQuestions || includeAnswerSection) return true
    setExportError('Pilih minimal satu isi dokumen.')
    return false
  }

  function openPrintWindow() {
    if (!assessment) return
    if (!validateExportSelection()) return

    const printWindow = window.open('', '_blank', 'noopener,noreferrer')
    if (!printWindow) {
      setExportError('Popup print diblokir browser.')
      return
    }

    setExportBusy('pdf')
    printWindow.document.write(`<!doctype html>
<html>
<head>
  <title>${escapeHTML(assessment.title)}</title>
  <style>
    * { box-sizing: border-box; }
    body { color: #111827; font-family: Arial, sans-serif; line-height: 1.5; margin: 32px; }
    h1 { font-size: 22px; margin: 0 0 4px; }
    h2 { border-bottom: 1px solid #d1d5db; font-size: 17px; margin: 28px 0 12px; padding-bottom: 6px; }
    .meta { color: #4b5563; margin: 0 0 20px; }
    .question { break-inside: avoid; margin-bottom: 20px; }
    .prompt { font-weight: 700; margin-bottom: 8px; }
    .option { margin-left: 18px; }
    .answer, .explanation { color: #374151; font-size: 13px; margin-left: 18px; }
    @media print { body { margin: 18mm; } }
  </style>
</head>
<body>
  <h1>${escapeHTML(assessment.title)}</h1>
  <p class="meta">${escapeHTML(assessment.subject)} - ${escapeHTML(assessment.grade)}</p>
  ${includeBlueprint ? `<h2>Kisi-kisi Soal</h2>${assessment.questions.map((question) => `
    <div class="question">${question.number}. ${escapeHTML(question.blueprint_item || question.prompt)} (${escapeHTML(question.type)}, ${escapeHTML(question.difficulty)})</div>
  `).join('')}` : ''}
  ${includeQuestions ? `<h2>Soal</h2>${assessment.questions.map((question) => `
      <section class="question">
        <div class="prompt">${question.number}. ${escapeHTML(question.prompt)}</div>
        ${(question.answer_options ?? []).map((option) => `
          <div class="option">${escapeHTML(option.label)}. ${escapeHTML(option.text)}</div>
        `).join('')}
      </section>
    `).join('')}` : ''}
  ${includeAnswerSection ? `<h2>Kunci Jawaban dan Pembahasan</h2>${assessment.questions.map((question) => `
      <section class="question">
        <div class="answer">${question.number}. Kunci: ${escapeHTML(question.correct_answer || '-')}</div>
        ${question.explanation ? `<div class="explanation">Pembahasan: ${escapeHTML(question.explanation)}</div>` : ''}
      </section>
    `).join('')}` : ''}
</body>
</html>`)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
    setExportBusy('')
    setExportOpen(false)
  }

  async function exportDOC() {
    if (!assessment) return
    if (!validateExportSelection()) return
    setMessage('')
    setExportBusy('doc')

    try {
      const response = await apiFetch(`/assessments/${assessment.id}/docx?${selectedExportQuery()}`)
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null
        throw new Error(payload?.error?.message ?? 'Gagal export DOC.')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${safeDownloadName(assessment.title)}.docx`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      setExportOpen(false)
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Gagal export DOC.')
    } finally {
      setExportBusy('')
    }
  }

  async function handleDeleteQuestion() {
    if (!assessment || !deleteQuestion) return

    setDeleteBusy(true)
    setDeleteError('')
    setMessage('')

    try {
      await apiJson<{ success: boolean }>(`/assessments/${assessment.id}/questions/${deleteQuestion.id}`, {
        method: 'DELETE',
      })

      setDeleteQuestion(null)
      setMessage(`Soal nomor ${deleteQuestion.number} berhasil dihapus.`)
      await loadAssessment()
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Gagal menghapus soal.')
    } finally {
      setDeleteBusy(false)
    }
  }

  if (loading || !assessment) {
    return (
      <div className='rounded-lg border bg-card p-5 shadow-sm'>
        <p className='text-sm text-muted-foreground'>Memuat assessment...</p>
        {error ? <p className='mt-3 rounded-md bg-destructive/10 p-3 text-sm text-destructive'>{error}</p> : null}
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap items-start justify-between gap-4'>
        <div>
          <h1 className='text-2xl font-semibold'>{assessment.title}</h1>
          <p className='mt-1 text-sm text-muted-foreground'>
            {assessment.subject} - {assessment.grade}
          </p>
          <Badge className='mt-3' variant='secondary'>{assessment.status}</Badge>
        </div>
        <div className='flex flex-wrap gap-2'>
          <Button onClick={openManualModal} variant='outline'>
            Tambah Soal
          </Button>
          <Button onClick={openGenerateModal}>
            Generate Soal
          </Button>
          <Button disabled={assessment.questions.length === 0} onClick={openExportModal} variant='outlinesecondary'>
            Export
          </Button>
        </div>
      </div>

      {message ? <p className='rounded-md bg-primary/10 p-3 text-sm text-primary'>{message}</p> : null}
      {error ? <p className='rounded-md bg-destructive/10 p-3 text-sm text-destructive'>{error}</p> : null}

      {assessment.questions.length === 0 ? (
        <div className='rounded-lg border bg-card p-8 text-center shadow-sm'>
          <h2 className='text-lg font-semibold'>Belum ada soal</h2>
          <p className='mt-2 text-sm text-muted-foreground'>
            Tambahkan soal manual atau generate soal dengan AI dari assessment ini.
          </p>
        </div>
      ) : null}

      <div className='space-y-4'>
        {assessment.questions.map((question) => (
          <article className='rounded-lg border bg-card p-5 shadow-sm' key={question.id}>
            <div className='flex flex-wrap items-start justify-between gap-3'>
              <div className='flex flex-wrap items-center gap-3'>
                <Badge>Nomor {question.number}</Badge>
                <Badge variant='secondary'>{question.type === 'essay' ? 'Essay' : 'Pilihan Ganda'}</Badge>
                <Badge variant='secondary'>{question.difficulty}</Badge>
              </div>
              <div className='flex flex-wrap gap-2'>
                <Button
                  size='sm'
                  type='button'
                  variant='outline'
                  onClick={() => openEditModal(question)}>
                  Edit
                </Button>
                <Button
                  size='sm'
                  type='button'
                  variant='outlineerror'
                  onClick={() => {
                    setDeleteError('')
                    setDeleteQuestion(question)
                  }}>
                  Hapus
                </Button>
              </div>
            </div>
            <p className='mt-4 font-medium'>{question.prompt}</p>
            {question.image_url ? (
              <figure className='mt-4 overflow-hidden rounded-md border bg-muted/20'>
                <img
                  alt={`Ilustrasi soal nomor ${question.number}`}
                  className='max-h-80 w-full object-contain bg-white'
                  loading='lazy'
                  src={question.image_url}
                />
                <figcaption className='border-t bg-card px-3 py-2 text-xs text-muted-foreground'>
                  <a className='text-primary underline-offset-4 hover:underline' href={question.image_url} rel='noreferrer' target='_blank'>
                    Buka gambar dari sumber luar
                  </a>
                </figcaption>
              </figure>
            ) : null}
            {question.type === 'multiple_choice' ? (
              <div className='mt-4 grid gap-2 md:grid-cols-2'>
                {question.answer_options.map((option) => (
                  <div
                    className={`rounded-md border p-3 text-sm ${option.is_correct ? 'border-primary bg-primary/10 text-primary' : 'bg-muted/20'}`}
                    key={`${question.id}-${option.label}`}>
                    <strong>{option.label}.</strong> {option.text}
                  </div>
                ))}
              </div>
            ) : null}
            {question.correct_answer ? (
              <p className='mt-4 text-sm text-muted-foreground'>
                <span className='font-semibold'>Jawaban:</span> {question.correct_answer}
              </p>
            ) : null}
            {question.explanation ? (
              <p className='mt-4 text-sm text-muted-foreground'>{question.explanation}</p>
            ) : null}
          </article>
        ))}
      </div>

      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent className='max-h-[90vh] max-w-2xl overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>Tambah Soal</DialogTitle>
            <DialogDescription className='font-normal text-muted-foreground'>
              Tambahkan soal manual ke assessment ini. Link gambar ilustrasi dapat memakai URL sumber luar.
            </DialogDescription>
          </DialogHeader>

          <form className='space-y-4' onSubmit={handleManualSubmit}>
            <div className='grid gap-4 md:grid-cols-3'>
              <div className='space-y-2'>
                <Label htmlFor='manual-number'>Nomor</Label>
                <Input id='manual-number' min={1} type='number' value={manualNumber} onChange={(event) => setManualNumber(event.target.value)} />
              </div>
              <div className='space-y-2'>
                <Label>Tipe Soal</Label>
                <Select value={manualType} onValueChange={setManualType}>
                  <SelectTrigger className='w-full'><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value='multiple_choice'>Pilihan Ganda</SelectItem>
                    <SelectItem value='essay'>Essay</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className='space-y-2'>
                <Label>Tingkat Kesulitan</Label>
                <Select value={manualDifficulty} onValueChange={setManualDifficulty}>
                  <SelectTrigger className='w-full'><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value='easy'>Mudah</SelectItem>
                    <SelectItem value='medium'>Sedang</SelectItem>
                    <SelectItem value='hard'>Sulit</SelectItem>
                    <SelectItem value='mixed'>Campuran</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='manual-prompt'>Pertanyaan</Label>
              <Textarea id='manual-prompt' rows={4} value={manualPrompt} onChange={(event) => setManualPrompt(event.target.value)} />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='manual-image'>Link Gambar Ilustrasi</Label>
              <Input id='manual-image' placeholder='https://...' value={manualImageURL} onChange={(event) => setManualImageURL(event.target.value)} />
            </div>

            {manualType === 'multiple_choice' ? (
              <div className='space-y-3 rounded-md border p-4'>
                <Label>Opsi Jawaban</Label>
                {manualOptions.map((option, index) => (
                  <div className='grid gap-2 md:grid-cols-[48px_1fr_110px]' key={option.label}>
                    <Input value={option.label} readOnly />
                    <Input
                      placeholder={`Opsi ${option.label}`}
                      value={option.text}
                      onChange={(event) =>
                        setManualOptions((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, text: event.target.value } : item
                          )
                        )
                      }
                    />
                    <label className='flex items-center gap-2 text-sm text-muted-foreground'>
                      <input
                        checked={option.is_correct}
                        name='manual-correct-answer'
                        type='radio'
                        onChange={() =>
                          setManualOptions((current) =>
                            current.map((item, itemIndex) => ({ ...item, is_correct: itemIndex === index }))
                          )
                        }
                      />
                      Benar
                    </label>
                  </div>
                ))}
              </div>
            ) : (
              <div className='space-y-2'>
                <Label htmlFor='manual-answer'>Jawaban Essay</Label>
                <Textarea id='manual-answer' rows={3} value={manualCorrectAnswer} onChange={(event) => setManualCorrectAnswer(event.target.value)} />
              </div>
            )}

            <div className='space-y-2'>
              <Label htmlFor='manual-explanation'>Pembahasan</Label>
              <Textarea id='manual-explanation' rows={3} value={manualExplanation} onChange={(event) => setManualExplanation(event.target.value)} />
            </div>

            {manualError ? <p className='rounded-md bg-destructive/10 p-3 text-sm text-destructive'>{manualError}</p> : null}

            <DialogFooter>
              <DialogClose asChild>
                <Button type='button' variant='outline'>Batal</Button>
              </DialogClose>
              <Button disabled={manualBusy} type='submit'>
                {manualBusy ? 'Menyimpan...' : 'Simpan Soal'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editQuestion)} onOpenChange={(open) => !open && setEditQuestion(null)}>
        <DialogContent className='max-h-[90vh] max-w-2xl overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>Edit Soal</DialogTitle>
            <DialogDescription className='font-normal text-muted-foreground'>
              Perbarui metadata, pertanyaan, opsi jawaban, dan pembahasan soal.
            </DialogDescription>
          </DialogHeader>

          <form className='space-y-4' onSubmit={handleEditSubmit}>
            <div className='grid gap-4 md:grid-cols-3'>
              <div className='space-y-2'>
                <Label htmlFor='edit-number'>Nomor</Label>
                <Input id='edit-number' min={1} type='number' value={editNumber} onChange={(event) => setEditNumber(event.target.value)} />
              </div>
              <div className='space-y-2'>
                <Label>Tipe Soal</Label>
                <Select value={editType} onValueChange={setEditType}>
                  <SelectTrigger className='w-full'><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value='multiple_choice'>Pilihan Ganda</SelectItem>
                    <SelectItem value='essay'>Essay</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className='space-y-2'>
                <Label>Tingkat Kesulitan</Label>
                <Select value={editDifficulty} onValueChange={setEditDifficulty}>
                  <SelectTrigger className='w-full'><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value='easy'>Mudah</SelectItem>
                    <SelectItem value='medium'>Sedang</SelectItem>
                    <SelectItem value='hard'>Sulit</SelectItem>
                    <SelectItem value='mixed'>Campuran</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='edit-blueprint'>Kisi-kisi / Blueprint</Label>
              <Textarea id='edit-blueprint' rows={2} value={editBlueprintItem} onChange={(event) => setEditBlueprintItem(event.target.value)} />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='edit-prompt'>Pertanyaan</Label>
              <Textarea id='edit-prompt' rows={4} value={editPrompt} onChange={(event) => setEditPrompt(event.target.value)} />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='edit-image'>Link Gambar Ilustrasi</Label>
              <Input id='edit-image' placeholder='https://...' value={editImageURL} onChange={(event) => setEditImageURL(event.target.value)} />
            </div>

            {editType === 'multiple_choice' ? (
              <div className='space-y-3 rounded-md border p-4'>
                <Label>Opsi Jawaban</Label>
                {editOptions.map((option, index) => (
                  <div className='grid gap-2 md:grid-cols-[48px_1fr_110px]' key={`${option.label}-${index}`}>
                    <Input
                      value={option.label}
                      onChange={(event) =>
                        setEditOptions((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, label: event.target.value.toUpperCase() } : item
                          )
                        )
                      }
                    />
                    <Input
                      placeholder={`Opsi ${option.label}`}
                      value={option.text}
                      onChange={(event) =>
                        setEditOptions((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, text: event.target.value } : item
                          )
                        )
                      }
                    />
                    <label className='flex items-center gap-2 text-sm text-muted-foreground'>
                      <input
                        checked={option.is_correct}
                        name='edit-correct-answer'
                        type='radio'
                        onChange={() =>
                          setEditOptions((current) =>
                            current.map((item, itemIndex) => ({ ...item, is_correct: itemIndex === index }))
                          )
                        }
                      />
                      Benar
                    </label>
                  </div>
                ))}
              </div>
            ) : (
              <div className='space-y-2'>
                <Label htmlFor='edit-answer'>Jawaban Essay</Label>
                <Textarea id='edit-answer' rows={3} value={editCorrectAnswer} onChange={(event) => setEditCorrectAnswer(event.target.value)} />
              </div>
            )}

            <div className='space-y-2'>
              <div className='flex flex-wrap items-center justify-between gap-2'>
                <Label htmlFor='edit-explanation'>Pembahasan</Label>
                <Button
                  disabled={editExplanationBusy || editBusy}
                  size='sm'
                  type='button'
                  variant='outline'
                  onClick={() => void handleGenerateExplanation()}>
                  {editExplanationBusy ? 'Generating...' : 'Generate AI'}
                </Button>
              </div>
              <Textarea id='edit-explanation' rows={3} value={editExplanation} onChange={(event) => setEditExplanation(event.target.value)} />
            </div>

            {editError ? <p className='rounded-md bg-destructive/10 p-3 text-sm text-destructive'>{editError}</p> : null}

            <DialogFooter>
              <DialogClose asChild>
                <Button disabled={editBusy || editExplanationBusy} type='button' variant='outline'>Batal</Button>
              </DialogClose>
              <Button disabled={editBusy || editExplanationBusy} type='submit'>
                {editBusy ? 'Menyimpan...' : 'Simpan Perubahan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent className='max-h-[90vh] max-w-2xl overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>Generate Soal</DialogTitle>
            <DialogDescription className='font-normal text-muted-foreground'>
              Masukkan materi pembelajaran sebagai acuan AI. Sistem tidak menyimpan file materi, hanya teks yang dikirim untuk proses generate.
            </DialogDescription>
          </DialogHeader>

          <form className='space-y-4' onSubmit={handleGenerateSubmit}>
            <div className='grid gap-4 md:grid-cols-3'>
              <div className='space-y-2'>
                <Label>Tipe Soal</Label>
                <Select value={generateType} onValueChange={setGenerateType}>
                  <SelectTrigger className='w-full'><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value='multiple_choice'>Pilihan Ganda</SelectItem>
                    <SelectItem value='essay'>Essay</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className='space-y-2'>
                <Label htmlFor='generate-count'>Jumlah Soal</Label>
                <Input id='generate-count' min={1} type='number' value={generateCount} onChange={(event) => setGenerateCount(event.target.value)} />
              </div>
              <div className='space-y-2'>
                <Label>Tingkat Kesulitan</Label>
                <Select value={generateDifficulty} onValueChange={setGenerateDifficulty}>
                  <SelectTrigger className='w-full'><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value='easy'>Mudah</SelectItem>
                    <SelectItem value='medium'>Sedang</SelectItem>
                    <SelectItem value='hard'>Sulit</SelectItem>
                    <SelectItem value='mixed'>Campuran</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className='space-y-2 rounded-md border p-4'>
              <Label htmlFor='generate-material-file'>File Materi Pembelajaran</Label>
              <Input
                accept='.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                disabled={generateExtractBusy || generateBusy}
                id='generate-material-file'
                type='file'
                onChange={(event) => void handleMaterialFileChange(event.target.files?.[0] ?? null)}
              />
              <p className='text-xs text-muted-foreground'>
                Upload PDF atau DOCX maksimal 10MB. File tidak disimpan; hanya teks hasil ekstrak yang dipakai sebagai acuan AI.
              </p>
              {generateExtractBusy ? (
                <p className='rounded-md bg-muted/40 p-3 text-sm text-muted-foreground'>Mengekstrak teks materi...</p>
              ) : null}
              {generateMaterialFilename ? (
                <p className='rounded-md bg-primary/10 p-3 text-sm text-primary'>
                  Materi berhasil diekstrak dari {generateMaterialFilename}.
                </p>
              ) : null}
            </div>

            <div className='space-y-2'>
              <Label htmlFor='generate-material'>Materi Pembelajaran</Label>
              <Textarea
                id='generate-material'
                rows={7}
                placeholder='Upload file PDF/DOCX atau tempel teks materi yang sudah diberikan kepada siswa.'
                value={generateMaterial}
                onChange={(event) => setGenerateMaterial(event.target.value)}
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='generate-blueprint'>Arahan Tambahan</Label>
              <Textarea
                id='generate-blueprint'
                rows={3}
                placeholder='Contoh: fokus pada pemahaman konsep, bukan hafalan.'
                value={generateBlueprint}
                onChange={(event) => setGenerateBlueprint(event.target.value)}
              />
            </div>

            <p className='rounded-md bg-muted/40 p-3 text-sm text-muted-foreground'>
              Estimasi kredit: {Number.parseInt(generateCount, 10) || 0} kredit.
            </p>

            {generateError ? <p className='rounded-md bg-destructive/10 p-3 text-sm text-destructive'>{generateError}</p> : null}

            <DialogFooter>
              <DialogClose asChild>
                <Button type='button' variant='outline'>Batal</Button>
              </DialogClose>
              <Button disabled={generateBusy} type='submit'>
                {generateBusy ? 'Memproses...' : 'Generate Soal'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Assessment</DialogTitle>
            <DialogDescription className='font-normal text-muted-foreground'>
              Pilih bagian dokumen yang ingin disertakan dalam hasil export.
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-3 rounded-md border p-4'>
            <label className='flex items-start gap-3 text-sm text-muted-foreground'>
              <input
                checked={includeBlueprint}
                className='mt-1'
                type='checkbox'
                onChange={(event) => setIncludeBlueprint(event.target.checked)}
              />
              <span>
                <span className='block font-semibold text-foreground'>Kisi-kisi soal</span>
                <span>Berisi ringkasan blueprint/topik, tipe soal, dan tingkat kesulitan.</span>
              </span>
            </label>
            <label className='flex items-start gap-3 text-sm text-muted-foreground'>
              <input
                checked={includeQuestions}
                className='mt-1'
                type='checkbox'
                onChange={(event) => setIncludeQuestions(event.target.checked)}
              />
              <span>
                <span className='block font-semibold text-foreground'>Soal</span>
                <span>Berisi pertanyaan dan opsi jawaban tanpa kunci.</span>
              </span>
            </label>
            <label className='flex items-start gap-3 text-sm text-muted-foreground'>
              <input
                checked={includeAnswerSection}
                className='mt-1'
                type='checkbox'
                onChange={(event) => setIncludeAnswerSection(event.target.checked)}
              />
              <span>
                <span className='block font-semibold text-foreground'>Kunci jawaban beserta penjelasan</span>
                <span>Berisi kunci jawaban dan pembahasan setiap soal.</span>
              </span>
            </label>
          </div>

          {exportError ? <p className='rounded-md bg-destructive/10 p-3 text-sm text-destructive'>{exportError}</p> : null}

          <DialogFooter>
            <DialogClose asChild>
              <Button disabled={exportBusy !== ''} type='button' variant='outline'>
                Batal
              </Button>
            </DialogClose>
            <Button disabled={exportBusy !== ''} type='button' variant='outlinesecondary' onClick={openPrintWindow}>
              {exportBusy === 'pdf' ? 'Membuka...' : 'Export PDF'}
            </Button>
            <Button disabled={exportBusy !== ''} type='button' onClick={() => void exportDOC()}>
              {exportBusy === 'doc' ? 'Menyiapkan...' : 'Export DOC'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteQuestion)} onOpenChange={(open) => !open && setDeleteQuestion(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Soal</DialogTitle>
            <DialogDescription className='font-normal text-muted-foreground'>
              Soal nomor {deleteQuestion?.number} akan dihapus dari assessment ini.
            </DialogDescription>
          </DialogHeader>

          {deleteQuestion ? (
            <p className='rounded-md bg-muted/40 p-3 text-sm text-muted-foreground'>
              {deleteQuestion.prompt}
            </p>
          ) : null}

          {deleteError ? <p className='rounded-md bg-destructive/10 p-3 text-sm text-destructive'>{deleteError}</p> : null}

          <DialogFooter>
            <DialogClose asChild>
              <Button disabled={deleteBusy} type='button' variant='outline'>
                Batal
              </Button>
            </DialogClose>
            <Button disabled={deleteBusy} type='button' variant='error' onClick={handleDeleteQuestion}>
              {deleteBusy ? 'Menghapus...' : 'Hapus Soal'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
