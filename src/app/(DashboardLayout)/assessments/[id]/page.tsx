'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'
import { Gem, GripVertical, Search } from 'lucide-react'
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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

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

type PublishResult = AssessmentDetail & {
  public_slug: string
  public_url: string
}

type BankQuestion = {
  id: string
  owner_name?: string
  category_name?: string
  subject: string
  grade: string
  type: string
  difficulty: string
  prompt: string
  assessment_count: number
}

type QuestionBankResponse = {
  questions: BankQuestion[]
  total: number
  limit: number
  offset: number
  next_offset: number
  has_more: boolean
}

type JobResult = {
  id: string
  type?: string
  status: string
  estimated_credit: number
  actual_credit: number
  input_snapshot_json?: string
}

type GenerateExplanationResult = {
  job: JobResult
  explanation: string
}

type GenerateImageResult = {
  job: JobResult
  image_url?: string
  queued?: boolean
}

type JobCost = {
  job_type: string
  display_name: string
  calculation_type: string
  unit_credit: number
  is_active: boolean
}

type ImportedQuestion = {
  prompt: string
  type: 'multiple_choice' | 'essay'
  answer_options: AnswerOption[]
  correct_answer: string
}

const defaultOptions: AnswerOption[] = [
  { label: 'A', text: '', is_correct: true },
  { label: 'B', text: '', is_correct: false },
  { label: 'C', text: '', is_correct: false },
  { label: 'D', text: '', is_correct: false },
]

const maxMaterialTextLength = 10000

function displayAssessmentStatus(status: string) {
  return status === 'published' || status === 'ready_to_export' || status === 'pdf_ready'
    ? 'Published'
    : 'Draft'
}

function parseJobInput(job: JobResult) {
  try {
    return JSON.parse(job.input_snapshot_json || '{}') as { assessment_id?: string }
  } catch {
    return {}
  }
}

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

async function extractDOCXText(file: File) {
  const buffer = await file.arrayBuffer()
  const mammoth = await import('mammoth')
  const result = await mammoth.extractRawText({ arrayBuffer: buffer })

  return result.value.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
}

function parseImportedQuestions(text: string): ImportedQuestion[] {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  const blocks: string[][] = []
  let current: string[] = []

  for (const line of lines) {
    if (/^\d+[\).]\s+/.test(line) && current.length > 0) {
      blocks.push(current)
      current = [line]
    } else if (/^\d+[\).]\s+/.test(line)) {
      current = [line]
    } else if (current.length > 0) {
      current.push(line)
    } else {
      continue
    }
  }
  if (current.length > 0) blocks.push(current)

  return blocks
    .map((block) => {
      const promptLines: string[] = []
      const options: AnswerOption[] = []
      let correctLabel = ''

      for (const line of block) {
        const optionMatch = line.match(/^([A-Ea-e])[\).]\s+(.+)$/)
        const answerMatch = line.match(/^(?:kunci|jawaban)\s*[:\-]\s*([A-Ea-e])$/i)

        if (optionMatch) {
          options.push({
            label: optionMatch[1].toUpperCase(),
            text: optionMatch[2].trim(),
            is_correct: false,
          })
        } else if (answerMatch) {
          correctLabel = answerMatch[1].toUpperCase()
        } else {
          promptLines.push(line.replace(/^\d+[\).]\s+/, '').trim())
        }
      }

      const normalizedOptions = options.map((option, index) => ({
        ...option,
        is_correct: correctLabel ? option.label === correctLabel : index === 0,
      }))

      return {
        prompt: promptLines.join(' ').trim(),
        type: normalizedOptions.length >= 2 ? 'multiple_choice' : 'essay',
        answer_options: normalizedOptions,
        correct_answer: correctLabel,
      } satisfies ImportedQuestion
    })
    .filter((question) => question.prompt)
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
  const [publishBusy, setPublishBusy] = useState(false)
  const [publishDialog, setPublishDialog] = useState<PublishResult | null>(null)
  const [deleteQuestion, setDeleteQuestion] = useState<Question | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [draggedQuestionID, setDraggedQuestionID] = useState('')
  const [reorderBusy, setReorderBusy] = useState(false)
  const [attachOpen, setAttachOpen] = useState(false)
  const [attachBusy, setAttachBusy] = useState(false)
  const [attachLoading, setAttachLoading] = useState(false)
  const [attachError, setAttachError] = useState('')
  const [attachQuery, setAttachQuery] = useState('')
  const [attachQuestions, setAttachQuestions] = useState<BankQuestion[]>([])
  const [attachSelectedIDs, setAttachSelectedIDs] = useState<string[]>([])

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

  const [importOpen, setImportOpen] = useState(false)
  const [importBusy, setImportBusy] = useState(false)
  const [importExtractBusy, setImportExtractBusy] = useState(false)
  const [importError, setImportError] = useState('')
  const [importFilename, setImportFilename] = useState('')
  const [importText, setImportText] = useState('')

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
  const [explanationCreditCost, setExplanationCreditCost] = useState(1)
  const [editImageBusy, setEditImageBusy] = useState(false)
  const [editImageDeleteBusy, setEditImageDeleteBusy] = useState(false)
  const [editImageManualOpen, setEditImageManualOpen] = useState(false)
  const [editImageInstruction, setEditImageInstruction] = useState('')
  const [editImageMode, setEditImageMode] = useState<'graphic' | 'diagram'>('graphic')
  const [editImageUseReference, setEditImageUseReference] = useState(false)
  const [imageCreditCost, setImageCreditCost] = useState(5)
  const [editImageJobID, setEditImageJobID] = useState('')

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
  const [generateQuestionUnitCredit, setGenerateQuestionUnitCredit] = useState(1)

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

  useEffect(() => {
    apiJson<JobCost>('/job-costs/generate_explanation')
      .then((res) => setExplanationCreditCost(res.data.unit_credit || 1))
      .catch(() => setExplanationCreditCost(1))
  }, [])

  useEffect(() => {
    apiJson<JobCost>('/job-costs/generate_question_image')
      .then((res) => setImageCreditCost(res.data.unit_credit || 5))
      .catch(() => setImageCreditCost(5))
  }, [])

  useEffect(() => {
    apiJson<JobCost>('/job-costs/generate_questions')
      .then((res) => setGenerateQuestionUnitCredit(res.data.unit_credit || 1))
      .catch(() => setGenerateQuestionUnitCredit(1))
  }, [])

  useEffect(() => {
    if (!editImageJobID) return

    const handleJobUpdated = async (event: Event) => {
      const job = (event as CustomEvent<JobResult>).detail
      if (!job || job.id !== editImageJobID || job.status === 'waiting' || job.status === 'processing') return

      setEditImageJobID('')
      if (job.status === 'completed') {
        setMessage('Gambar ilustrasi selesai dibuat. Notifikasi juga tersedia di navbar.')
        await loadAssessment()
        return
      }

      setEditError('Generate gambar gagal. Cek notifikasi atau halaman Jobs AI untuk detail.')
    }

    window.addEventListener('teachery:job-updated', handleJobUpdated)
    return () => window.removeEventListener('teachery:job-updated', handleJobUpdated)
  }, [editImageJobID])

  useEffect(() => {
    const handleGenerateQuestionsUpdated = async (event: Event) => {
      const job = (event as CustomEvent<JobResult>).detail
      if (!job || job.type !== 'generate_questions' || job.status !== 'completed') return

      const input = parseJobInput(job)
      if (input.assessment_id !== params.id) return

      setMessage('Generate soal selesai. Daftar soal sudah diperbarui.')
      await loadAssessment()
    }

    window.addEventListener('teachery:job-updated', handleGenerateQuestionsUpdated)
    return () => window.removeEventListener('teachery:job-updated', handleGenerateQuestionsUpdated)
  }, [params.id])

  const generateQuestionCreditCost =
    (Number.parseInt(generateCount, 10) || 0) * generateQuestionUnitCredit
  const generateMaterialLength = generateMaterial.length
  const isGenerateMaterialTooLong = generateMaterialLength > maxMaterialTextLength
  const importedQuestions = parseImportedQuestions(importText)

  function nextQuestionNumber() {
    if (!assessment || assessment.questions.length === 0) return 1
    return Math.max(...assessment.questions.map((question) => question.number)) + 1
  }

  async function loadAttachQuestions(queryValue = attachQuery) {
    setAttachLoading(true)
    setAttachError('')

    const params = new URLSearchParams({ limit: '30', offset: '0' })
    if (queryValue.trim()) params.set('q', queryValue.trim())

    try {
      const res = await apiJson<QuestionBankResponse>(`/question-bank?${params.toString()}`)
      setAttachQuestions(res.data.questions)
    } catch (err) {
      setAttachError(err instanceof Error ? err.message : 'Gagal memuat bank soal.')
    } finally {
      setAttachLoading(false)
    }
  }

  function openAttachModal() {
    setAttachOpen(true)
    setAttachError('')
    setAttachQuery('')
    setAttachSelectedIDs([])
    void loadAttachQuestions('')
  }

  function toggleAttachQuestion(questionID: string) {
    setAttachSelectedIDs((current) =>
      current.includes(questionID)
        ? current.filter((id) => id !== questionID)
        : [...current, questionID]
    )
  }

  async function handleAttachQuestions(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAttachError('')
    setMessage('')
    if (attachSelectedIDs.length === 0) {
      setAttachError('Pilih minimal satu soal dari bank soal.')
      return
    }

    setAttachBusy(true)
    try {
      const res = await apiJson<{ attached_count: number; skipped_count: number }>(
        `/assessments/${params.id}/questions/attach`,
        {
          method: 'POST',
          body: JSON.stringify({ question_ids: attachSelectedIDs }),
        }
      )

      setAttachOpen(false)
      setMessage(
        `Berhasil attach ${res.data.attached_count} soal dari bank soal${
          res.data.skipped_count ? `, ${res.data.skipped_count} soal sudah ada dan dilewati` : ''
        }.`
      )
      await loadAssessment()
    } catch (err) {
      setAttachError(err instanceof Error ? err.message : 'Gagal attach soal dari bank soal.')
    } finally {
      setAttachBusy(false)
    }
  }

  function reorderedQuestions(sourceID: string, targetID: string) {
    if (!assessment || sourceID === targetID) return null

    const current = [...assessment.questions]
    const sourceIndex = current.findIndex((question) => question.id === sourceID)
    const targetIndex = current.findIndex((question) => question.id === targetID)
    if (sourceIndex < 0 || targetIndex < 0) return null

    const [moved] = current.splice(sourceIndex, 1)
    current.splice(targetIndex, 0, moved)

    return current.map((question, index) => ({ ...question, number: index + 1 }))
  }

  async function handleQuestionDrop(targetID: string) {
    if (!assessment || !draggedQuestionID || draggedQuestionID === targetID || reorderBusy) {
      setDraggedQuestionID('')
      return
    }

    const nextQuestions = reorderedQuestions(draggedQuestionID, targetID)
    if (!nextQuestions) {
      setDraggedQuestionID('')
      return
    }

    const previousAssessment = assessment
    setAssessment({ ...assessment, questions: nextQuestions })
    setDraggedQuestionID('')
    setReorderBusy(true)
    setError('')
    setMessage('')

    try {
      const res = await apiJson<{ questions: Question[] }>(`/assessments/${assessment.id}/questions/reorder`, {
        method: 'POST',
        body: JSON.stringify({ question_ids: nextQuestions.map((question) => question.id) }),
      })
      setAssessment((current) => (current ? { ...current, questions: res.data.questions } : current))
      setMessage('Urutan soal berhasil diperbarui.')
    } catch (err) {
      setAssessment(previousAssessment)
      setError(err instanceof Error ? err.message : 'Gagal memperbarui urutan soal.')
    } finally {
      setReorderBusy(false)
    }
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

  function openImportModal() {
    setImportText('')
    setImportFilename('')
    setImportError('')
    setImportOpen(true)
  }

  async function handleImportFileChange(file: File | null) {
    setImportError('')
    setImportFilename('')

    if (!file) return
    if (
      file.type !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' &&
      !/\.docx$/i.test(file.name)
    ) {
      setImportError('Format file tidak didukung. Gunakan DOCX.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setImportError('Ukuran file terlalu besar. Maksimal 10MB.')
      return
    }

    setImportExtractBusy(true)
    try {
      const text = await extractDOCXText(file)
      if (!text) throw new Error('DOCX tidak memiliki teks yang dapat dibaca.')
      setImportText(text)
      setImportFilename(file.name)
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Gagal mengekstrak DOCX.')
    } finally {
      setImportExtractBusy(false)
    }
  }

  async function handleImportSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setImportError('')
    setMessage('')
    if (!assessment) return
    if (importedQuestions.length === 0) {
      setImportError('Tidak ada soal yang berhasil dibaca dari DOCX.')
      return
    }

    const startNumber = nextQuestionNumber()
    setImportBusy(true)
    try {
      for (const [index, question] of importedQuestions.entries()) {
        await apiJson<Question>(`/assessments/${assessment.id}/questions`, {
          method: 'POST',
          body: JSON.stringify({
            number: startNumber + index,
            type: question.type,
            difficulty: 'medium',
            prompt: question.prompt,
            image_url: '',
            correct_answer: question.type === 'essay' ? question.correct_answer : '',
            explanation: '',
            answer_options:
              question.type === 'multiple_choice'
                ? question.answer_options.map((option) => ({
                    label: option.label,
                    text: option.text,
                    is_correct: option.is_correct,
                  }))
                : [],
          }),
        })
      }

      setImportOpen(false)
      setMessage(`${importedQuestions.length} soal berhasil diimpor dari DOCX.`)
      await loadAssessment()
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Gagal mengimpor soal.')
    } finally {
      setImportBusy(false)
    }
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
    setEditImageBusy(false)
    setEditImageDeleteBusy(false)
    setEditImageManualOpen(false)
    setEditImageInstruction('')
    setEditImageMode('graphic')
    setEditImageUseReference(false)
    setEditImageJobID('')
    setEditError('')
  }

  function handleUseManualImageURL() {
    setEditImageManualOpen(false)
    setMessage('Link gambar ilustrasi sudah diisi. Klik Simpan Perubahan untuk menyimpan soal.')
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

  async function handleGenerateImage() {
    setEditError('')
    setMessage('')
    if (!assessment || !editQuestion) return
    if (!editPrompt.trim()) {
      setEditError('Pertanyaan wajib diisi sebelum generate gambar.')
      return
    }

    setEditImageBusy(true)
    try {
      const res = await apiJson<GenerateImageResult>(
        `/assessments/${assessment.id}/questions/${editQuestion.id}/image`,
        {
          method: 'POST',
          body: JSON.stringify({
            question_text: editPrompt.trim(),
            instructions: editImageInstruction.trim() || editBlueprintItem.trim(),
            image_mode: editImageMode,
            use_reference_image: editImageMode === 'graphic' && Boolean(editImageURL && editImageUseReference),
          }),
        }
      )

      if (res.data.image_url) {
        setEditImageURL(res.data.image_url)
        setMessage(
          `Gambar ilustrasi berhasil dibuat. Kredit terpakai: ${res.data.job.actual_credit || res.data.job.estimated_credit}.`
        )
        await loadAssessment()
      } else {
        setEditImageJobID(res.data.job.id)
        setMessage('Generate gambar sedang diproses di background. Anda bisa menutup dialog; notifikasi akan muncul di navbar saat selesai.')
      }
      setEditImageInstruction('')
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Gagal generate gambar ilustrasi.')
    } finally {
      setEditImageBusy(false)
    }
  }

  async function handleDeleteImage() {
    setEditError('')
    setMessage('')
    if (!assessment || !editQuestion) return

    setEditImageDeleteBusy(true)
    try {
      await apiJson<{ success: boolean }>(
        `/assessments/${assessment.id}/questions/${editQuestion.id}/image`,
        { method: 'DELETE' }
      )
      setEditImageURL('')
      setMessage('Gambar ilustrasi berhasil dihapus.')
      await loadAssessment()
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Gagal menghapus gambar ilustrasi.')
    } finally {
      setEditImageDeleteBusy(false)
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
    if (generateMaterial.trim().length > maxMaterialTextLength) {
      setGenerateError(`Teks materi terlalu panjang (${generateMaterial.trim().length.toLocaleString('id-ID')} karakter). Maksimal ${maxMaterialTextLength.toLocaleString('id-ID')} karakter.`)
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
        `Generate soal sedang diproses di background. Estimasi kredit: ${res.data.estimated_credit}. Notifikasi akan muncul di navbar saat selesai.`
      )
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
    .illustration { margin: 10px 0 12px; max-width: 100%; }
    .illustration img { border: 1px solid #d1d5db; display: block; max-height: 320px; max-width: 100%; object-fit: contain; }
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
        ${question.image_url ? `<figure class="illustration"><img alt="Ilustrasi soal nomor ${question.number}" src="${escapeHTML(question.image_url)}" /></figure>` : ''}
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
  <script>
    async function waitForImages() {
      const images = Array.from(document.images);
      await Promise.all(images.map((image) => {
        if (image.complete) return Promise.resolve();
        return new Promise((resolve) => {
          image.onload = resolve;
          image.onerror = resolve;
        });
      }));
    }

    window.addEventListener('load', async () => {
      await waitForImages();
      window.focus();
      window.print();
    });
  </script>
</body>
</html>`)
    printWindow.document.close()
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

  async function handlePublishAssessment() {
    if (!assessment) return

    setPublishBusy(true)
    setError('')
    setMessage('')

    try {
      const res = await apiJson<PublishResult>(`/assessments/${assessment.id}/publish`, {
        method: 'POST',
      })
      setPublishDialog(res.data)
      setMessage(`Assessment "${assessment.title}" berhasil dipublish.`)
      await loadAssessment()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal publish assessment.')
    } finally {
      setPublishBusy(false)
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

  const assessmentStatus = displayAssessmentStatus(assessment.status)
  const isPublished = assessmentStatus === 'Published'

  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap items-start justify-between gap-4'>
        <div>
          <h1 className='text-2xl font-semibold'>{assessment.title}</h1>
          <p className='mt-1 text-sm text-muted-foreground'>
            {assessment.subject} - {assessment.grade}
          </p>
          <Badge className='mt-3' variant='secondary'>{assessmentStatus}</Badge>
        </div>
        <div className='flex flex-wrap gap-2'>
          <Button asChild variant='outline'>
            <Link href={`/submissions/${assessment.id}`}>Review Jawaban</Link>
          </Button>
          {!isPublished ? (
            <>
              <Button onClick={openManualModal} variant='outline'>
                Tambah Soal
              </Button>
              <Button onClick={openAttachModal} variant='outline'>
                Attach dari Bank Soal
              </Button>
              <Button onClick={openImportModal} variant='outline'>
                Import DOCX
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {message ? <p className='rounded-md bg-primary/10 p-3 text-sm text-primary'>{message}</p> : null}
      {error ? <p className='rounded-md bg-destructive/10 p-3 text-sm text-destructive'>{error}</p> : null}
      {isPublished ? (
        <p className='rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground'>
          Assessment sudah Published. Daftar soal dikunci agar skor submission yang sudah masuk tetap konsisten.
        </p>
      ) : null}

      {assessment.questions.length === 0 ? (
        <div className='rounded-lg border bg-card p-8 text-center shadow-sm'>
          <h2 className='text-lg font-semibold'>Belum ada soal</h2>
          <p className='mt-2 text-sm text-muted-foreground'>
            Tambahkan soal manual atau pilih soal dari bank soal.
          </p>
        </div>
      ) : null}

      <div className='space-y-4'>
        {assessment.questions.map((question) => (
          <article
            className={`rounded-lg border bg-card p-5 shadow-sm transition ${
              draggedQuestionID === question.id ? 'border-primary opacity-60 ring-2 ring-primary/20' : ''
            }`}
            draggable={!isPublished && !reorderBusy}
            key={question.id}
            onDragEnd={() => setDraggedQuestionID('')}
            onDragOver={(event) => {
              if (!isPublished) event.preventDefault()
            }}
            onDragStart={(event) => {
              if (isPublished) return
              event.dataTransfer.effectAllowed = 'move'
              event.dataTransfer.setData('text/plain', question.id)
              setDraggedQuestionID(question.id)
            }}
            onDrop={(event) => {
              event.preventDefault()
              if (isPublished) return
              void handleQuestionDrop(question.id)
            }}>
            <div className='flex flex-wrap items-start justify-between gap-3'>
              <div className='flex flex-wrap items-center gap-3'>
                {!isPublished ? (
                  <span
                    aria-label='Drag untuk mengubah urutan soal'
                    className='inline-flex h-8 w-8 cursor-grab items-center justify-center rounded-md border bg-muted/30 text-muted-foreground active:cursor-grabbing'
                    title='Drag untuk mengubah urutan soal'>
                    <GripVertical className='size-4' />
                  </span>
                ) : null}
                <Badge>Nomor {question.number}</Badge>
                <Badge variant='secondary'>{question.type === 'essay' ? 'Essay' : 'Pilihan Ganda'}</Badge>
                <Badge variant='secondary'>{question.difficulty}</Badge>
              </div>
              {!isPublished ? (
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
              ) : null}
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

      {assessment.questions.length > 0 ? (
        <div className='flex flex-wrap justify-end gap-2 rounded-lg border bg-card p-4 shadow-sm'>
          <Button
            disabled={publishBusy}
            type='button'
            onClick={() => void handlePublishAssessment()}>
            {publishBusy ? 'Publishing...' : isPublished ? 'Lihat QR' : 'Publish'}
          </Button>
          <Button onClick={openExportModal} type='button' variant='outlinesecondary'>
            Export
          </Button>
        </div>
      ) : null}

      <Dialog open={attachOpen} onOpenChange={setAttachOpen}>
        <DialogContent className='max-h-[90vh] w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-4xl'>
          <DialogHeader>
            <DialogTitle>Attach Soal dari Bank Soal</DialogTitle>
            <DialogDescription className='font-normal text-muted-foreground'>
              Pilih soal yang akan dimasukkan ke assessment ini. Soal yang sudah ada akan dilewati.
            </DialogDescription>
          </DialogHeader>

          <form className='space-y-4' onSubmit={handleAttachQuestions}>
            <div className='grid gap-2 md:grid-cols-[1fr_auto]'>
              <div className='relative'>
                <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
                <Input
                  className='pl-9'
                  placeholder='Cari teks soal, mapel, kategori, atau kisi-kisi'
                  value={attachQuery}
                  onChange={(event) => setAttachQuery(event.target.value)}
                />
              </div>
              <Button disabled={attachLoading} type='button' variant='outline' onClick={() => void loadAttachQuestions()}>
                {attachLoading ? 'Memuat...' : 'Cari'}
              </Button>
            </div>

            <div className='rounded-md border'>
              {attachLoading ? (
                <p className='p-4 text-sm text-muted-foreground'>Memuat bank soal...</p>
              ) : null}
              {!attachLoading && attachQuestions.length === 0 ? (
                <p className='p-4 text-sm text-muted-foreground'>Tidak ada soal bank yang cocok.</p>
              ) : null}
              {!attachLoading && attachQuestions.length > 0 ? (
                <div className='max-h-[48vh] divide-y overflow-y-auto'>
                  {attachQuestions.map((question) => {
                    const alreadyAttached = assessment.questions.some((item) => item.id === question.id)
                    const selected = attachSelectedIDs.includes(question.id)

                    return (
                      <label
                        className={`flex cursor-pointer items-start gap-3 p-4 transition-colors ${
                          selected ? 'bg-primary/10' : 'hover:bg-muted/40'
                        } ${alreadyAttached ? 'opacity-60' : ''}`}
                        key={question.id}>
                        <input
                          checked={selected || alreadyAttached}
                          className='mt-1'
                          disabled={alreadyAttached}
                          type='checkbox'
                          onChange={() => toggleAttachQuestion(question.id)}
                        />
                        <span className='min-w-0 flex-1 space-y-2'>
                          <span className='line-clamp-2 block text-sm font-semibold text-foreground'>
                            {question.prompt}
                          </span>
                          <span className='flex flex-wrap gap-2'>
                            <Badge variant='secondary'>{question.subject} - {question.grade}</Badge>
                            <Badge variant='outline'>{question.type === 'essay' ? 'Essay' : 'Pilihan Ganda'}</Badge>
                            <Badge variant='outline'>{question.category_name || 'Tanpa kategori'}</Badge>
                            {alreadyAttached ? <Badge>Sudah ada</Badge> : null}
                          </span>
                        </span>
                      </label>
                    )
                  })}
                </div>
              ) : null}
            </div>

            {attachError ? <p className='rounded-md bg-destructive/10 p-3 text-sm text-destructive'>{attachError}</p> : null}

            <DialogFooter>
              <DialogClose asChild>
                <Button disabled={attachBusy} type='button' variant='outline'>Batal</Button>
              </DialogClose>
              <Button disabled={attachBusy || attachSelectedIDs.length === 0} type='submit'>
                {attachBusy ? 'Menyimpan...' : `Attach ${attachSelectedIDs.length} Soal`}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className='max-h-[92vh] w-[calc(100vw-2rem)] sm:max-w-4xl overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>Import Soal dari DOCX</DialogTitle>
            <DialogDescription className='font-normal text-muted-foreground'>
              Upload file DOCX berisi soal bernomor. Sistem akan membaca pola opsi A, B, C, D jika tersedia.
            </DialogDescription>
          </DialogHeader>

          <form className='space-y-4' onSubmit={handleImportSubmit}>
            <div className='space-y-2 rounded-md border p-4'>
              <Label htmlFor='import-docx'>File DOCX</Label>
              <Input
                accept='.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                disabled={importBusy || importExtractBusy}
                id='import-docx'
                type='file'
                onChange={(event) => void handleImportFileChange(event.target.files?.[0] ?? null)}
              />
              {importExtractBusy ? (
                <p className='rounded-md bg-muted/40 p-3 text-sm text-muted-foreground'>Mengekstrak isi DOCX...</p>
              ) : null}
              {importFilename ? (
                <p className='rounded-md bg-primary/10 p-3 text-sm text-primary'>
                  Teks berhasil diekstrak dari {importFilename}.
                </p>
              ) : null}
            </div>

            <div className='space-y-2'>
              <Label htmlFor='import-text'>Teks Hasil Ekstrak</Label>
              <Textarea
                disabled={importBusy}
                id='import-text'
                placeholder={'1. Teks pertanyaan\\nA. Opsi A\\nB. Opsi B\\nC. Opsi C\\nD. Opsi D\\nKunci: A'}
                rows={10}
                value={importText}
                onChange={(event) => setImportText(event.target.value)}
              />
            </div>

            <div className='rounded-md border bg-muted/20 p-4'>
              <p className='text-sm font-semibold'>{importedQuestions.length} soal terbaca</p>
              <p className='mt-1 text-xs text-muted-foreground'>
                Jika kunci jawaban tidak ditemukan, pilihan pertama akan ditandai sebagai jawaban benar sementara.
              </p>
              {importedQuestions.length > 0 ? (
                <div className='mt-3 max-h-48 space-y-2 overflow-y-auto text-sm'>
                  {importedQuestions.slice(0, 5).map((question, index) => (
                    <div className='rounded-md bg-background p-3' key={`${question.prompt}-${index}`}>
                      <p className='font-medium'>{index + 1}. {question.prompt}</p>
                      <p className='mt-1 text-xs text-muted-foreground'>
                        {question.type === 'multiple_choice'
                          ? `${question.answer_options.length} opsi pilihan ganda`
                          : 'Essay'}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            {importError ? <p className='rounded-md bg-destructive/10 p-3 text-sm text-destructive'>{importError}</p> : null}

            <DialogFooter>
              <DialogClose asChild>
                <Button disabled={importBusy || importExtractBusy} type='button' variant='outline'>Batal</Button>
              </DialogClose>
              <Button disabled={importBusy || importExtractBusy || importedQuestions.length === 0} type='submit'>
                {importBusy ? 'Mengimpor...' : 'Import Soal'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent className='max-h-[92vh] w-[calc(100vw-2rem)] sm:max-w-4xl overflow-y-auto'>
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
        <DialogContent className='max-h-[92vh] w-[calc(100vw-2rem)] sm:max-w-4xl overflow-y-auto'>
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
              <div className='flex flex-wrap items-center justify-between gap-2'>
                <Label>Gambar Ilustrasi</Label>
                <div className='flex flex-wrap gap-2'>
                  <Button
                    disabled={editImageBusy || editImageDeleteBusy || editExplanationBusy || editBusy || Boolean(editImageJobID)}
                    size='sm'
                    type='button'
                    variant='outline'
                    onClick={() => setEditImageManualOpen((current) => !current)}>
                    {editImageManualOpen ? 'Tutup Link Manual' : 'Masukkan Link Manual'}
                  </Button>
                  {editImageURL ? (
                    <Button
                      disabled={editImageBusy || editImageDeleteBusy || editExplanationBusy || editBusy || Boolean(editImageJobID)}
                      size='sm'
                      type='button'
                      variant='outlineerror'
                      onClick={() => void handleDeleteImage()}>
                      {editImageDeleteBusy ? 'Menghapus...' : 'Hapus Gambar'}
                    </Button>
                  ) : null}
                  <Button
                    disabled={editImageBusy || editImageDeleteBusy || editExplanationBusy || editBusy || Boolean(editImageJobID)}
                    size='sm'
                    type='button'
                    className='gap-0 overflow-hidden px-0'
                    onClick={() => void handleGenerateImage()}>
                    <span className='flex items-center gap-1.5 px-2.5 text-primary-foreground'>
                      <Gem className='size-3.5' />
                      <span>{imageCreditCost}</span>
                    </span>
                    <span className='h-4 w-px bg-primary-foreground/35' />
                    <span className='px-2.5'>
                      {editImageJobID ? 'Diproses...' : editImageBusy ? 'Menyiapkan...' : editImageURL ? 'Generate Ulang' : 'Generate Gambar AI'}
                    </span>
                  </Button>
                </div>
              </div>
              {editImageJobID ? (
                <p className='rounded-md bg-primary/10 p-3 text-sm text-primary'>
                  Job gambar sedang berjalan di background. Tombol dikunci sampai proses selesai.
                </p>
              ) : null}
              {editImageManualOpen ? (
                <div className='grid gap-2 rounded-md border bg-muted/20 p-3 md:grid-cols-[1fr_auto]'>
                  <Input
                    disabled={editImageBusy || editImageDeleteBusy || editBusy || Boolean(editImageJobID)}
                    placeholder='https://example.com/gambar-ilustrasi.png'
                    value={editImageURL}
                    onChange={(event) => setEditImageURL(event.target.value)}
                  />
                  <Button
                    disabled={editImageBusy || editImageDeleteBusy || editBusy || Boolean(editImageJobID) || !editImageURL.trim()}
                    type='button'
                    variant='outline'
                    onClick={handleUseManualImageURL}>
                    Gunakan Link
                  </Button>
                </div>
              ) : null}
              <div className='space-y-2 rounded-md border bg-muted/20 p-3'>
                <div className='flex flex-wrap items-center justify-between gap-3 rounded-md border bg-background px-3 py-2'>
                  <div className='space-y-0.5'>
                    <Label htmlFor='edit-image-mode'>Mode Gambar</Label>
                    <p className='text-xs text-muted-foreground'>
                      {editImageMode === 'diagram' ? 'Diagram SVG untuk bentuk, grafik, atau skema.' : 'Graphic untuk ilustrasi visual biasa.'}
                    </p>
                  </div>
                  <ToggleGroup
                    className='rounded-md border bg-muted/40 p-1'
                    disabled={editImageBusy || editImageDeleteBusy || editBusy || Boolean(editImageJobID)}
                    size='sm'
                    spacing={1}
                    type='single'
                    value={editImageMode}
                    variant='outline'
                    onValueChange={(value) => {
                      if (value !== 'graphic' && value !== 'diagram') return
                      setEditImageMode(value)
                      if (value === 'diagram') setEditImageUseReference(false)
                    }}>
                    <ToggleGroupItem
                      aria-label='Gunakan mode graphic'
                      className='min-w-20 data-[state=on]:border-blue-600 data-[state=on]:bg-blue-600 data-[state=on]:text-white data-[state=on]:hover:bg-blue-600'
                      value='graphic'>
                      Graphic
                    </ToggleGroupItem>
                    <ToggleGroupItem
                      aria-label='Gunakan mode diagram'
                      className='min-w-20 data-[state=on]:border-blue-600 data-[state=on]:bg-blue-600 data-[state=on]:text-white data-[state=on]:hover:bg-blue-600'
                      value='diagram'>
                      Diagram
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>
                <Label htmlFor='edit-image-instruction'>
                  {editImageURL ? 'Arahan Revisi Gambar' : 'Arahan Generate Gambar'}
                </Label>
                <Textarea
                  disabled={editImageBusy || editImageDeleteBusy || editBusy || Boolean(editImageJobID)}
                  id='edit-image-instruction'
                  placeholder={
                    editImageURL
                      ? 'Contoh: buat diagram lebih sederhana, perbesar label sudut, gunakan warna yang lebih kontras.'
                      : 'Contoh: buat diagram geometri sederhana tanpa menampilkan jawaban akhir.'
                  }
                  rows={2}
                  value={editImageInstruction}
                  onChange={(event) => setEditImageInstruction(event.target.value)}
                />
                {editImageURL && editImageMode === 'graphic' ? (
                  <label className='flex items-start gap-2 text-sm text-muted-foreground'>
                    <input
                      checked={editImageUseReference}
                      className='mt-1'
                      disabled={editImageBusy || editImageDeleteBusy || editBusy || Boolean(editImageJobID)}
                      type='checkbox'
                      onChange={(event) => setEditImageUseReference(event.target.checked)}
                    />
                    <span>
                      Gunakan gambar saat ini sebagai referensi revisi.
                      Biarkan tidak dicentang jika gambar saat ini salah dan ingin membuat ulang dari prompt.
                    </span>
                  </label>
                ) : null}
              </div>
              {editImageURL ? (
                <figure className='overflow-hidden rounded-md border bg-muted/20'>
                  <img
                    alt='Preview gambar ilustrasi'
                    className='max-h-64 w-full object-contain bg-white'
                    src={editImageURL}
                  />
                </figure>
              ) : (
                <p className='rounded-md border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground'>
                  Belum ada gambar ilustrasi untuk soal ini.
                </p>
              )}
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
                <div className="relative inline-flex rounded-md p-px align-middle">
                  <Button
                    disabled={editExplanationBusy || editImageBusy || editImageDeleteBusy || editBusy}
                    size='sm'
                    type='button'
                    variant='outline'
                    className="relative z-10 gap-0 overflow-hidden rounded-[calc(var(--radius-md)-1px)] bg-background px-0 leading-none shadow-none hover:bg-background disabled:opacity-80 dark:bg-background dark:hover:bg-background"
                    onClick={() => void handleGenerateExplanation()}>
                    <span className='inline-flex h-full items-center gap-1.5 px-2.5 text-primary'>
                      <Gem className='size-3.5 shrink-0' strokeWidth={2.25} />
                      <span className='leading-none'>{explanationCreditCost}</span>
                    </span>
                    <span className='h-4 w-px shrink-0 self-center bg-border' />
                    <span className='inline-flex h-full min-w-[82px] items-center justify-center px-2.5 leading-none'>
                      {editExplanationBusy ? 'Generating...' : 'Generate AI'}
                    </span>
                  </Button>
                </div>
              </div>
              <Textarea id='edit-explanation' rows={3} value={editExplanation} onChange={(event) => setEditExplanation(event.target.value)} />
            </div>

            {editError ? <p className='rounded-md bg-destructive/10 p-3 text-sm text-destructive'>{editError}</p> : null}

            <DialogFooter>
              <DialogClose asChild>
                <Button disabled={editBusy || editExplanationBusy || editImageBusy || editImageDeleteBusy || Boolean(editImageJobID)} type='button' variant='outline'>Batal</Button>
              </DialogClose>
              <Button disabled={editBusy || editExplanationBusy || editImageBusy || editImageDeleteBusy || Boolean(editImageJobID)} type='submit'>
                {editBusy ? 'Menyimpan...' : 'Simpan Perubahan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent className='max-h-[90vh] w-[calc(100vw-2rem)] sm:max-w-4xl overflow-y-auto'>
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
              <div className='flex items-center justify-end'>
                <span
                  className={`text-xs font-semibold ${
                    isGenerateMaterialTooLong ? 'text-destructive' : 'text-emerald-600'
                  }`}>
                  {generateMaterialLength.toLocaleString('id-ID')}/{maxMaterialTextLength.toLocaleString('id-ID')}
                </span>
              </div>
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

            {generateError ? <p className='rounded-md bg-destructive/10 p-3 text-sm text-destructive'>{generateError}</p> : null}

            <DialogFooter>
              <DialogClose asChild>
                <Button type='button' variant='outline'>Batal</Button>
              </DialogClose>
              <Button
                disabled={generateBusy}
                type='submit'
                className='gap-0 overflow-hidden px-0'>
                <span className='flex items-center gap-1.5 px-2.5 text-primary-foreground'>
                  <Gem className='size-3.5' />
                  <span>{generateQuestionCreditCost}</span>
                </span>
                <span className='h-4 w-px bg-primary-foreground/35' />
                <span className='px-2.5'>
                  {generateBusy ? 'Memproses...' : 'Generate Soal'}
                </span>
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
                    Copy
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <DialogClose asChild>
              <Button type='button'>Tutup</Button>
            </DialogClose>
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
