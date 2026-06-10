'use client'

import { DragEvent, FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { Archive, BookOpen, Filter, Gem, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { apiJson } from '@/lib/teachery-api'

type AnswerOption = {
  id: string
  label: string
  text: string
  is_correct: boolean
}

type BankQuestion = {
  id: string
  owner_name?: string
  category_id?: string | null
  category_name?: string
  subject: string
  grade: string
  type: string
  difficulty: string
  prompt: string
  image_url?: string | null
  correct_answer?: string | null
  explanation?: string | null
  blueprint_item?: string | null
  tags_json?: string | null
  source: string
  assessment_count: number
  updated_at: string
  answer_options: AnswerOption[]
}

type QuestionBankResponse = {
  questions: BankQuestion[]
  total: number
  limit: number
  offset: number
  next_offset: number
  has_more: boolean
}

type GenerateQuestionBankResponse = {
  job: JobResult
  questions: BankQuestion[]
  queued?: boolean
}

type QuestionCategory = {
  id: string
  name: string
  subject?: string | null
  grade?: string | null
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

const defaultOptions: AnswerOption[] = [
  { id: '', label: 'A', text: '', is_correct: true },
  { id: '', label: 'B', text: '', is_correct: false },
  { id: '', label: 'C', text: '', is_correct: false },
  { id: '', label: 'D', text: '', is_correct: false },
]

const maxMaterialTextLength = 10000

function parseJobInput(job: JobResult) {
  try {
    return JSON.parse(job.input_snapshot_json || '{}') as { question_bank?: boolean }
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

function displayType(value: string) {
  return value === 'multiple_choice' ? 'Pilihan Ganda' : 'Essay'
}

function displayDifficulty(value: string) {
  const labels: Record<string, string> = {
    easy: 'Mudah',
    medium: 'Sedang',
    hard: 'Sulit',
    mixed: 'Campuran',
  }
  return labels[value] ?? value
}

function formatDateTime(value: string) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(value))
}

export default function QuestionBankPage() {
  const [questions, setQuestions] = useState<BankQuestion[]>([])
  const [selectedID, setSelectedID] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [subject, setSubject] = useState('')
  const [grade, setGrade] = useState('')
  const [type, setType] = useState('')
  const [difficulty, setDifficulty] = useState('')
  const [total, setTotal] = useState(0)
  const [nextOffset, setNextOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [editQuestion, setEditQuestion] = useState<BankQuestion | null>(null)
  const [editSubject, setEditSubject] = useState('')
  const [editGrade, setEditGrade] = useState('')
  const [editType, setEditType] = useState('multiple_choice')
  const [editDifficulty, setEditDifficulty] = useState('medium')
  const [editPrompt, setEditPrompt] = useState('')
  const [editImageURL, setEditImageURL] = useState('')
  const [editCorrectAnswer, setEditCorrectAnswer] = useState('')
  const [editExplanation, setEditExplanation] = useState('')
  const [editBlueprintItem, setEditBlueprintItem] = useState('')
  const [editOptions, setEditOptions] = useState<AnswerOption[]>(defaultOptions)
  const [editBusy, setEditBusy] = useState(false)
  const [editError, setEditError] = useState('')
  const [message, setMessage] = useState('')
  const [editExplanationBusy, setEditExplanationBusy] = useState(false)
  const [explanationCreditCost, setExplanationCreditCost] = useState(1)
  const [editImageBusy, setEditImageBusy] = useState(false)
  const [editImageDeleteBusy, setEditImageDeleteBusy] = useState(false)
  const [editImageManualOpen, setEditImageManualOpen] = useState(false)
  const [editImageInstruction, setEditImageInstruction] = useState('')
  const [editImageMode, setEditImageMode] = useState<'graphic' | 'diagram'>('graphic')
  const [editImageUseReference, setEditImageUseReference] = useState(false)
  const [editImageJobID, setEditImageJobID] = useState('')
  const [imageCreditCost, setImageCreditCost] = useState(5)
  const [categories, setCategories] = useState<QuestionCategory[]>([])
  const [addCategoryOpen, setAddCategoryOpen] = useState(false)
  const [addCategoryBusy, setAddCategoryBusy] = useState(false)
  const [addCategoryError, setAddCategoryError] = useState('')
  const [addCategoryName, setAddCategoryName] = useState('')
  const [addCategorySubject, setAddCategorySubject] = useState('')
  const [addCategoryGrade, setAddCategoryGrade] = useState('')
  const [draggedQuestionID, setDraggedQuestionID] = useState('')
  const [dropCategoryID, setDropCategoryID] = useState('')
  const [categoryMoveBusy, setCategoryMoveBusy] = useState(false)
  const [deleteQuestionID, setDeleteQuestionID] = useState('')
  const [generateOpen, setGenerateOpen] = useState(false)
  const [generateBusy, setGenerateBusy] = useState(false)
  const [generateError, setGenerateError] = useState('')
  const [generateSubject, setGenerateSubject] = useState('')
  const [generateGrade, setGenerateGrade] = useState('')
  const [generateCategoryID, setGenerateCategoryID] = useState('')
  const [generateType, setGenerateType] = useState('multiple_choice')
  const [generateCount, setGenerateCount] = useState('5')
  const [generateDifficulty, setGenerateDifficulty] = useState('mixed')
  const [generateMaterial, setGenerateMaterial] = useState('')
  const [generateMaterialFilename, setGenerateMaterialFilename] = useState('')
  const [generateExtractBusy, setGenerateExtractBusy] = useState(false)
  const [generateBlueprint, setGenerateBlueprint] = useState('')
  const [generateQuestionUnitCredit, setGenerateQuestionUnitCredit] = useState(1)

  const selectedQuestion = useMemo(
    () => questions.find((question) => question.id === selectedID) ?? questions[0] ?? null,
    [questions, selectedID]
  )

  const questionGroups = useMemo(() => {
    const categorized = categories.map((category) => ({
      id: category.id,
      label: category.name,
      questions: questions.filter((question) => question.category_id === category.id),
    }))
    const knownCategoryNames = new Set(categories.map((category) => category.name))
    const categoryOnlyFromQuestions = questions
      .filter((question) => question.category_name && !question.category_id && !knownCategoryNames.has(question.category_name))
      .reduce<{ id: string; label: string; questions: BankQuestion[] }[]>((groups, question) => {
        const label = question.category_name || ''
        const existing = groups.find((group) => group.label === label)
        if (existing) {
          existing.questions.push(question)
        } else {
          groups.push({ id: `category-name-${label}`, label, questions: [question] })
        }
        return groups
      }, [])
    const uncategorized = questions.filter((question) => !question.category_id && !question.category_name)

    return [
      ...categorized,
      ...categoryOnlyFromQuestions,
      { id: 'uncategorize', label: 'uncategorize', questions: uncategorized },
    ]
  }, [categories, questions])

  const questionGroupValues = useMemo(
    () => questionGroups.map((group) => group.id),
    [questionGroups]
  )
  const generateQuestionCreditCost =
    (Number.parseInt(generateCount, 10) || 0) * generateQuestionUnitCredit
  const generateMaterialLength = generateMaterial.length
  const isGenerateMaterialTooLong = generateMaterialLength > maxMaterialTextLength

  async function loadCategories() {
    try {
      const res = await apiJson<QuestionCategory[]>('/question-categories')
      setCategories(res.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat kategori soal.')
    }
  }

  const loadQuestionBank = useCallback(async (options: { append?: boolean; offset?: number } = {}) => {
    const append = options.append ?? false
    const offset = options.offset ?? 0
    const params = new URLSearchParams({
      limit: '20',
      offset: String(offset),
    })

    if (query.trim()) params.set('q', query.trim())
    if (subject.trim()) params.set('subject', subject.trim())
    if (grade.trim()) params.set('grade', grade.trim())
    if (type) params.set('type', type)
    if (difficulty) params.set('difficulty', difficulty)

    if (append) {
      setLoadingMore(true)
    } else {
      setLoading(true)
    }
    setError('')

    try {
      const res = await apiJson<QuestionBankResponse>(`/question-bank?${params.toString()}`)
      setQuestions((current) => append ? [...current, ...res.data.questions] : res.data.questions)
      setTotal(res.data.total)
      setNextOffset(res.data.next_offset)
      setHasMore(res.data.has_more)
      setSelectedID((current) => {
        if (append && current) return current
        return res.data.questions[0]?.id || ''
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat bank soal.')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [difficulty, grade, query, subject, type])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadQuestionBank({ offset: 0 })
    }, 300)

    return () => window.clearTimeout(timer)
  }, [loadQuestionBank])

  useEffect(() => {
    void loadCategories()
  }, [])

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
        await loadQuestionBank({ offset: 0 })
        return
      }

      setEditError('Generate gambar gagal. Cek notifikasi atau halaman Jobs AI untuk detail.')
    }

    window.addEventListener('teachery:job-updated', handleJobUpdated)
    return () => window.removeEventListener('teachery:job-updated', handleJobUpdated)
  }, [editImageJobID, loadQuestionBank])

  useEffect(() => {
    const handleGenerateQuestionsUpdated = async (event: Event) => {
      const job = (event as CustomEvent<JobResult>).detail
      if (!job || job.type !== 'generate_questions' || job.status !== 'completed') return

      const input = parseJobInput(job)
      if (!input.question_bank) return

      setMessage('Generate soal selesai. Bank soal sudah diperbarui.')
      await loadQuestionBank({ offset: 0 })
    }

    window.addEventListener('teachery:job-updated', handleGenerateQuestionsUpdated)
    return () => window.removeEventListener('teachery:job-updated', handleGenerateQuestionsUpdated)
  }, [loadQuestionBank])

  function clearFilters() {
    setQuery('')
    setSubject('')
    setGrade('')
    setType('')
    setDifficulty('')
  }

  function resetAddCategoryForm() {
    setAddCategoryName('')
    setAddCategorySubject('')
    setAddCategoryGrade('')
    setAddCategoryError('')
  }

  function openGenerateModal() {
    setGenerateSubject(subject)
    setGenerateGrade(grade)
    setGenerateCategoryID('')
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

  async function handleGenerateMaterialFileChange(file: File | null) {
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
      if (!extractedText) throw new Error('Materi tidak memiliki teks yang dapat dibaca.')
      setGenerateMaterial(extractedText)
      setGenerateMaterialFilename(file.name)
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : 'Materi tidak dapat diekstrak.')
    } finally {
      setGenerateExtractBusy(false)
    }
  }

  async function handleGenerateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setGenerateError('')
    setMessage('')

    const questionCount = Number.parseInt(generateCount, 10)
    if (!generateSubject.trim() || !generateGrade.trim()) {
      setGenerateError('Mata pelajaran dan kelas wajib diisi.')
      return
    }
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
      const res = await apiJson<GenerateQuestionBankResponse>('/question-bank/generate', {
        method: 'POST',
        body: JSON.stringify({
          subject: generateSubject.trim(),
          grade: generateGrade.trim(),
          category_id: generateCategoryID || null,
          question_type: generateType,
          question_count: questionCount,
          difficulty: generateDifficulty,
          material_text: generateMaterial.trim(),
          blueprint: generateBlueprint.trim(),
        }),
      })

      setGenerateOpen(false)
      setMessage(
        `Generate soal sedang diproses di background. Estimasi kredit: ${res.data.job.estimated_credit}. Notifikasi akan muncul di navbar saat selesai.`
      )
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : 'Gagal generate soal.')
    } finally {
      setGenerateBusy(false)
    }
  }

  async function handleAddCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAddCategoryError('')
    setMessage('')

    if (!addCategoryName.trim()) {
      setAddCategoryError('Nama kategori wajib diisi.')
      return
    }

    setAddCategoryBusy(true)
    try {
      await apiJson<QuestionCategory>('/question-categories', {
        method: 'POST',
        body: JSON.stringify({
          name: addCategoryName.trim(),
          subject: addCategorySubject.trim(),
          grade: addCategoryGrade.trim(),
        }),
      })
      setAddCategoryOpen(false)
      resetAddCategoryForm()
      setMessage('Kategori berhasil ditambahkan.')
      await loadCategories()
    } catch (err) {
      setAddCategoryError(err instanceof Error ? err.message : 'Gagal menambahkan kategori.')
    } finally {
      setAddCategoryBusy(false)
    }
  }

  async function handleQuestionDrop(event: DragEvent<HTMLElement>, targetCategoryID: string | null) {
    event.preventDefault()
    const questionID = event.dataTransfer.getData('text/plain') || draggedQuestionID
    setDropCategoryID('')
    setDraggedQuestionID('')
    setMessage('')
    setError('')

    const question = questions.find((item) => item.id === questionID)
    if (!question) return
    if ((question.category_id ?? null) === targetCategoryID) return

    const targetCategory = targetCategoryID
      ? categories.find((category) => category.id === targetCategoryID)
      : null
    const previousQuestion = question
    setCategoryMoveBusy(true)
    setQuestions((current) =>
      current.map((item) =>
        item.id === questionID
          ? {
              ...item,
              category_id: targetCategoryID,
              category_name: targetCategory?.name ?? undefined,
            }
          : item
      )
    )

    try {
      const res = await apiJson<BankQuestion>(`/question-bank/${questionID}/category`, {
        method: 'PATCH',
        body: JSON.stringify({ category_id: targetCategoryID }),
      })
      setQuestions((current) =>
        current.map((item) => (item.id === questionID ? res.data : item))
      )
      setSelectedID(questionID)
      setMessage(
        targetCategory ? `Soal dipindahkan ke kategori ${targetCategory.name}.` : 'Soal dipindahkan ke uncategorize.'
      )
    } catch (err) {
      setQuestions((current) =>
        current.map((item) => (item.id === questionID ? previousQuestion : item))
      )
      setError(err instanceof Error ? err.message : 'Gagal memindahkan kategori soal.')
    } finally {
      setCategoryMoveBusy(false)
    }
  }

  async function handleDeleteQuestion(question: BankQuestion) {
    setMessage('')
    setError('')

    const confirmed = window.confirm('Hapus soal ini dari bank soal? Soal yang masih dipakai assessment tidak dapat dihapus.')
    if (!confirmed) return

    setDeleteQuestionID(question.id)
    try {
      await apiJson<{ success: boolean }>(`/question-bank/${question.id}`, { method: 'DELETE' })
      setQuestions((current) => current.filter((item) => item.id !== question.id))
      setSelectedID((current) => {
        if (current !== question.id) return current
        return questions.find((item) => item.id !== question.id)?.id ?? ''
      })
      setTotal((current) => Math.max(0, current - 1))
      setMessage('Soal berhasil dihapus dari bank soal.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus soal.')
    } finally {
      setDeleteQuestionID('')
    }
  }

  function normalizeQuestionOptions(question: BankQuestion) {
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

  function openEditDialog(question: BankQuestion) {
    setEditQuestion(question)
    setEditSubject(question.subject)
    setEditGrade(question.grade)
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
    setMessage('')
  }

  function updateEditedQuestion(patch: Partial<BankQuestion>) {
    if (!editQuestion) return
    setQuestions((current) =>
      current.map((question) => (question.id === editQuestion.id ? { ...question, ...patch } : question))
    )
    setSelectedID(editQuestion.id)
  }

  function handleUseManualImageURL() {
    setEditImageManualOpen(false)
    setMessage('Link gambar ilustrasi sudah diisi. Klik Simpan Perubahan untuk menyimpan soal.')
  }

  async function handleGenerateExplanation() {
    setEditError('')
    setMessage('')
    if (!editQuestion) return
    if (!editPrompt.trim()) {
      setEditError('Pertanyaan wajib diisi sebelum generate pembahasan.')
      return
    }

    setEditExplanationBusy(true)
    try {
      const res = await apiJson<GenerateExplanationResult>(
        `/question-bank/${editQuestion.id}/explanation`,
        {
          method: 'POST',
          body: JSON.stringify({ question_text: editPrompt.trim() }),
        }
      )

      setEditExplanation(res.data.explanation)
      updateEditedQuestion({ explanation: res.data.explanation })
      setMessage(
        `Pembahasan berhasil dibuat dengan AI. Kredit terpakai: ${res.data.job.actual_credit || res.data.job.estimated_credit}.`
      )
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Gagal generate pembahasan.')
    } finally {
      setEditExplanationBusy(false)
    }
  }

  async function handleGenerateImage() {
    setEditError('')
    setMessage('')
    if (!editQuestion) return
    if (!editPrompt.trim()) {
      setEditError('Pertanyaan wajib diisi sebelum generate gambar.')
      return
    }

    setEditImageBusy(true)
    try {
      const res = await apiJson<GenerateImageResult>(
        `/question-bank/${editQuestion.id}/image`,
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
        updateEditedQuestion({ image_url: res.data.image_url })
        setMessage(
          `Gambar ilustrasi berhasil dibuat. Kredit terpakai: ${res.data.job.actual_credit || res.data.job.estimated_credit}.`
        )
      } else {
        setEditImageJobID(res.data.job.id)
        setMessage('Generate gambar sedang diproses di background. Anda bisa menutup dialog; notifikasi akan muncul di navbar saat selesai.')
      }
      setEditImageInstruction('')
      setEditImageUseReference(false)
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Gagal generate gambar ilustrasi.')
    } finally {
      setEditImageBusy(false)
    }
  }

  async function handleDeleteImage() {
    setEditError('')
    setMessage('')
    if (!editQuestion) return

    setEditImageDeleteBusy(true)
    try {
      await apiJson<{ success: boolean }>(`/question-bank/${editQuestion.id}/image`, { method: 'DELETE' })
      setEditImageURL('')
      setEditImageUseReference(false)
      updateEditedQuestion({ image_url: null })
      setMessage('Gambar ilustrasi berhasil dihapus.')
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Gagal menghapus gambar ilustrasi.')
    } finally {
      setEditImageDeleteBusy(false)
    }
  }

  async function handleEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editQuestion) return

    setEditError('')
    if (!editSubject.trim() || !editGrade.trim()) {
      setEditError('Mata pelajaran dan kelas wajib diisi.')
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
      const res = await apiJson<BankQuestion>(`/question-bank/${editQuestion.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          subject: editSubject.trim(),
          grade: editGrade.trim(),
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

      setQuestions((current) =>
        current.map((question) => (question.id === editQuestion.id ? res.data : question))
      )
      setSelectedID(res.data.id)
      setEditQuestion(null)
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Gagal memperbarui soal.')
    } finally {
      setEditBusy(false)
    }
  }

  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div>
          <h1 className='text-2xl font-semibold text-foreground'>Bank Soal</h1>
          <p className='mt-1 text-sm text-muted-foreground'>
            Kumpulan soal reusable yang dapat dipakai ulang di beberapa assessment.
          </p>
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <Button type='button' onClick={openGenerateModal}>
            <Gem className='mr-2 size-4' />
            Generate Soal
          </Button>
          <Badge className='gap-2' variant='secondary'>
            <Archive className='h-4 w-4' />
            {total} soal
          </Badge>
        </div>
      </div>

      <div className='rounded-lg border bg-card p-4 shadow-sm'>
        <div className='grid gap-3 lg:grid-cols-[1.5fr_repeat(4,1fr)_auto]'>
          <div className='space-y-2'>
            <Label htmlFor='question-search'>Cari Soal</Label>
            <div className='relative'>
              <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
              <Input
                className='pl-9'
                id='question-search'
                placeholder='Cari teks soal, kategori, atau tag'
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='subject-filter'>Mapel</Label>
            <Input
              id='subject-filter'
              placeholder='Semua mapel'
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor='grade-filter'>Kelas</Label>
            <Input
              id='grade-filter'
              placeholder='Semua kelas'
              value={grade}
              onChange={(event) => setGrade(event.target.value)}
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor='type-filter'>Tipe</Label>
            <select
              className='h-10 w-full rounded-md border bg-background px-3 text-sm'
              id='type-filter'
              value={type}
              onChange={(event) => setType(event.target.value)}>
              <option value=''>Semua</option>
              <option value='multiple_choice'>Pilihan Ganda</option>
              <option value='essay'>Essay</option>
            </select>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='difficulty-filter'>Level</Label>
            <select
              className='h-10 w-full rounded-md border bg-background px-3 text-sm'
              id='difficulty-filter'
              value={difficulty}
              onChange={(event) => setDifficulty(event.target.value)}>
              <option value=''>Semua</option>
              <option value='easy'>Mudah</option>
              <option value='medium'>Sedang</option>
              <option value='hard'>Sulit</option>
              <option value='mixed'>Campuran</option>
            </select>
          </div>

          <div className='flex items-end'>
            <Button className='w-full gap-2 lg:w-auto' type='button' variant='outline' onClick={clearFilters}>
              <Filter className='h-4 w-4' />
              Reset
            </Button>
          </div>
        </div>
      </div>

      {message ? <p className='rounded-md bg-primary/10 p-3 text-sm text-primary'>{message}</p> : null}
      {loading ? <p className='text-sm text-muted-foreground'>Memuat bank soal...</p> : null}
      {error ? <p className='rounded-md bg-destructive/10 p-3 text-sm text-destructive'>{error}</p> : null}

      {!loading && !error && questions.length === 0 ? (
        <Card>
          <CardContent className='py-8 text-center'>
            <h2 className='text-lg font-semibold'>Belum ada soal di bank</h2>
            <p className='mt-2 text-sm text-muted-foreground'>
              Soal yang dibuat dari halaman assessment akan otomatis tersimpan di bank soal.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {!loading && questions.length > 0 ? (
        <div className='grid gap-5 xl:grid-cols-[420px_1fr]'>
          <div className='space-y-3'>
            <div className='flex flex-wrap items-center justify-between gap-2 text-sm'>
              <div>
                <p className='font-medium'>{questions.length} soal dimuat</p>
                <p className='text-muted-foreground'>Dari {total} soal</p>
              </div>
              <Button size='sm' type='button' onClick={() => setAddCategoryOpen(true)}>
                <Plus className='mr-2 h-4 w-4' />
                add Category
              </Button>
            </div>

            <Accordion className='gap-2' key={questionGroupValues.join('|')} type='multiple' defaultValue={questionGroupValues}>
              {questionGroups.map((group) => (
                <AccordionItem
                  className={`rounded-lg border bg-card px-3 transition-colors ${
                    dropCategoryID === group.id ? 'border-primary bg-primary/10' : ''
                  }`}
                  key={group.id}
                  onDragEnter={() => setDropCategoryID(group.id)}
                  onDragLeave={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                      setDropCategoryID('')
                    }
                  }}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => void handleQuestionDrop(event, group.id === 'uncategorize' ? null : group.id)}
                  value={group.id}>
                  <AccordionTrigger className='gap-3 hover:no-underline'>
                    <span className='min-w-0 flex-1 truncate'>{group.label}</span>
                    <Badge className='mr-2 shrink-0' variant='secondary'>{group.questions.length}</Badge>
                  </AccordionTrigger>
                  <AccordionContent className='h-auto space-y-3 pb-3'>
                    {group.questions.length === 0 ? (
                      <p className='rounded-md border border-dashed bg-muted/20 p-3 text-sm text-muted-foreground'>
                        Belum ada soal di kategori ini.
                      </p>
                    ) : null}
                    {group.questions.map((question) => {
                      const selected = selectedQuestion?.id === question.id

                      return (
                        <button
                          className={`relative w-full cursor-grab rounded-lg border p-4 pb-11 text-left transition-colors active:cursor-grabbing ${
                            selected ? 'border-primary bg-primary/10' : 'bg-background hover:bg-muted/40'
                          } ${draggedQuestionID === question.id ? 'opacity-60' : ''}`}
                          draggable={!categoryMoveBusy}
                          key={question.id}
                          type='button'
                          onDragEnd={() => {
                            setDraggedQuestionID('')
                            setDropCategoryID('')
                          }}
                          onDragStart={(event) => {
                            setDraggedQuestionID(question.id)
                            event.dataTransfer.setData('text/plain', question.id)
                            event.dataTransfer.effectAllowed = 'move'
                          }}
                          onClick={() => setSelectedID(question.id)}>
                          <div className='flex items-start justify-between gap-3'>
                            <div className='min-w-0 space-y-1'>
                              <p className='line-clamp-2 text-sm font-semibold text-foreground'>{question.prompt}</p>
                              <p className='text-xs text-muted-foreground'>
                                {question.subject} - {question.grade}
                              </p>
                            </div>
                            <Badge variant='outline'>{displayType(question.type)}</Badge>
                          </div>
                          <div className='mt-3 flex flex-wrap gap-2'>
                            <Badge variant='secondary'>{displayDifficulty(question.difficulty)}</Badge>
                            <Badge variant='secondary'>{question.category_name || 'Tanpa kategori'}</Badge>
                            {question.owner_name ? <Badge variant='outline'>{question.owner_name}</Badge> : null}
                            <Badge variant='outline'>{question.assessment_count} assessment</Badge>
                          </div>
                          <span
                            className='absolute bottom-3 right-3 inline-flex h-8 w-8 items-center justify-center rounded-md border border-destructive/30 bg-background text-destructive shadow-sm transition-colors hover:bg-destructive hover:text-destructive-foreground'
                            role='button'
                            tabIndex={0}
                            title='Hapus soal'
                            onClick={(event) => {
                              event.preventDefault()
                              event.stopPropagation()
                              void handleDeleteQuestion(question)
                            }}
                            onDragStart={(event) => event.stopPropagation()}
                            onKeyDown={(event) => {
                              if (event.key !== 'Enter' && event.key !== ' ') return
                              event.preventDefault()
                              event.stopPropagation()
                              void handleDeleteQuestion(question)
                            }}>
                            {deleteQuestionID === question.id ? (
                              <span className='h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent' />
                            ) : (
                              <Trash2 className='h-4 w-4' />
                            )}
                          </span>
                        </button>
                      )
                    })}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>

            {hasMore ? (
              <Button
                className='w-full'
                disabled={loadingMore}
                type='button'
                variant='outline'
                onClick={() => void loadQuestionBank({ append: true, offset: nextOffset })}>
                {loadingMore ? 'Memuat...' : 'Muat Lagi'}
              </Button>
            ) : null}
          </div>

          <Card>
            <CardHeader>
              <div className='flex flex-wrap items-start justify-between gap-3'>
                <div>
                  <CardTitle className='flex items-center gap-2'>
                    <BookOpen className='h-5 w-5' />
                    Detail Soal
                  </CardTitle>
                  <p className='mt-1 text-sm text-muted-foreground'>
                    {selectedQuestion
                      ? `${selectedQuestion.subject} - ${selectedQuestion.grade}`
                      : 'Pilih soal untuk melihat detail.'}
                  </p>
                </div>
                {selectedQuestion ? (
                  <div className='flex flex-wrap gap-2'>
                    <Button size='sm' type='button' variant='outline' onClick={() => openEditDialog(selectedQuestion)}>
                      <Pencil className='mr-2 h-4 w-4' />
                      Edit
                    </Button>
                    <Badge variant='secondary'>{displayDifficulty(selectedQuestion.difficulty)}</Badge>
                  </div>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className='space-y-5'>
              {selectedQuestion ? (
                <>
                  <div className='flex flex-wrap gap-2'>
                    <Badge>{displayType(selectedQuestion.type)}</Badge>
                    <Badge variant='outline'>{selectedQuestion.category_name || 'Tanpa kategori'}</Badge>
                    {selectedQuestion.owner_name ? <Badge variant='outline'>Guru: {selectedQuestion.owner_name}</Badge> : null}
                    <Badge variant='outline'>Sumber: {selectedQuestion.source || 'manual'}</Badge>
                    <Badge variant='outline'>Dipakai {selectedQuestion.assessment_count} assessment</Badge>
                  </div>

                  <div>
                    <p className='text-xs font-medium uppercase text-muted-foreground'>Pertanyaan</p>
                    <p className='mt-2 whitespace-pre-wrap text-sm leading-relaxed'>{selectedQuestion.prompt}</p>
                  </div>

                  {selectedQuestion.image_url ? (
                    <div className='overflow-hidden rounded-md border bg-white'>
                      <img
                        alt='Ilustrasi soal'
                        className='h-auto max-h-[360px] w-full object-contain'
                        src={selectedQuestion.image_url}
                      />
                    </div>
                  ) : null}

                  {selectedQuestion.answer_options.length > 0 ? (
                    <div>
                      <p className='text-xs font-medium uppercase text-muted-foreground'>Pilihan Jawaban</p>
                      <div className='mt-2 space-y-2'>
                        {selectedQuestion.answer_options.map((option) => (
                          <div
                            className={`rounded-md border p-3 text-sm ${
                              option.is_correct ? 'border-primary bg-primary/10 text-primary' : 'bg-muted/20'
                            }`}
                            key={option.id}>
                            <span className='font-semibold'>{option.label}.</span> {option.text}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className='grid gap-3 text-sm md:grid-cols-2'>
                    <div className='rounded-md bg-muted/40 p-3'>
                      <p className='text-xs font-medium uppercase text-muted-foreground'>Kunci Jawaban</p>
                      <p className='mt-1 font-medium'>{selectedQuestion.correct_answer || '-'}</p>
                    </div>
                    <div className='rounded-md bg-muted/40 p-3'>
                      <p className='text-xs font-medium uppercase text-muted-foreground'>Update Terakhir</p>
                      <p className='mt-1 font-medium'>{formatDateTime(selectedQuestion.updated_at)}</p>
                    </div>
                  </div>

                  {selectedQuestion.blueprint_item ? (
                    <div>
                      <p className='text-xs font-medium uppercase text-muted-foreground'>Kisi-kisi</p>
                      <p className='mt-2 text-sm'>{selectedQuestion.blueprint_item}</p>
                    </div>
                  ) : null}

                  {selectedQuestion.explanation ? (
                    <div>
                      <p className='text-xs font-medium uppercase text-muted-foreground'>Pembahasan</p>
                      <p className='mt-2 whitespace-pre-wrap text-sm leading-relaxed'>{selectedQuestion.explanation}</p>
                    </div>
                  ) : null}
                </>
              ) : (
                <p className='text-sm text-muted-foreground'>Tidak ada soal untuk ditampilkan.</p>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      <Dialog
        open={addCategoryOpen}
        onOpenChange={(open) => {
          setAddCategoryOpen(open)
          if (!open) resetAddCategoryForm()
        }}>
        <DialogContent className='max-w-lg'>
          <DialogHeader>
            <DialogTitle>Add Category</DialogTitle>
          </DialogHeader>

          <form className='space-y-4' onSubmit={handleAddCategory}>
            <div className='space-y-2'>
              <Label htmlFor='category-name'>Nama Kategori</Label>
              <Input
                id='category-name'
                placeholder='Contoh: Aljabar'
                value={addCategoryName}
                onChange={(event) => setAddCategoryName(event.target.value)}
              />
            </div>

            <div className='grid gap-4 md:grid-cols-2'>
              <div className='space-y-2'>
                <Label htmlFor='category-subject'>Mapel</Label>
                <Input
                  id='category-subject'
                  placeholder='Opsional'
                  value={addCategorySubject}
                  onChange={(event) => setAddCategorySubject(event.target.value)}
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='category-grade'>Kelas</Label>
                <Input
                  id='category-grade'
                  placeholder='Opsional'
                  value={addCategoryGrade}
                  onChange={(event) => setAddCategoryGrade(event.target.value)}
                />
              </div>
            </div>

            {addCategoryError ? <p className='rounded-md bg-destructive/10 p-3 text-sm text-destructive'>{addCategoryError}</p> : null}

            <DialogFooter>
              <DialogClose asChild>
                <Button disabled={addCategoryBusy} type='button' variant='outline'>Batal</Button>
              </DialogClose>
              <Button disabled={addCategoryBusy} type='submit'>
                {addCategoryBusy ? 'Menyimpan...' : 'Tambah Kategori'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent className='max-h-[90vh] w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-4xl'>
          <DialogHeader>
            <DialogTitle>Generate Soal</DialogTitle>
          </DialogHeader>

          <form className='space-y-4' onSubmit={handleGenerateSubmit}>
            <div className='grid gap-4 md:grid-cols-3'>
              <div className='space-y-2'>
                <Label htmlFor='generate-subject'>Mata Pelajaran</Label>
                <Input
                  id='generate-subject'
                  placeholder='Contoh: Matematika'
                  value={generateSubject}
                  onChange={(event) => setGenerateSubject(event.target.value)}
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='generate-grade'>Kelas</Label>
                <Input
                  id='generate-grade'
                  placeholder='Contoh: Kelas 7'
                  value={generateGrade}
                  onChange={(event) => setGenerateGrade(event.target.value)}
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='generate-category'>Kategori</Label>
                <select
                  className='h-10 w-full rounded-md border bg-background px-3 text-sm'
                  id='generate-category'
                  value={generateCategoryID}
                  onChange={(event) => setGenerateCategoryID(event.target.value)}>
                  <option value=''>uncategorize</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className='grid gap-4 md:grid-cols-3'>
              <div className='space-y-2'>
                <Label htmlFor='generate-type'>Tipe Soal</Label>
                <select
                  className='h-10 w-full rounded-md border bg-background px-3 text-sm'
                  id='generate-type'
                  value={generateType}
                  onChange={(event) => setGenerateType(event.target.value)}>
                  <option value='multiple_choice'>Pilihan Ganda</option>
                  <option value='essay'>Essay</option>
                </select>
              </div>
              <div className='space-y-2'>
                <Label htmlFor='generate-count'>Jumlah Soal</Label>
                <Input
                  id='generate-count'
                  min={1}
                  type='number'
                  value={generateCount}
                  onChange={(event) => setGenerateCount(event.target.value)}
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='generate-difficulty'>Tingkat Kesulitan</Label>
                <select
                  className='h-10 w-full rounded-md border bg-background px-3 text-sm'
                  id='generate-difficulty'
                  value={generateDifficulty}
                  onChange={(event) => setGenerateDifficulty(event.target.value)}>
                  <option value='easy'>Mudah</option>
                  <option value='medium'>Sedang</option>
                  <option value='hard'>Sulit</option>
                  <option value='mixed'>Campuran</option>
                </select>
              </div>
            </div>

            <div className='space-y-2 rounded-md border p-4'>
              <Label htmlFor='generate-material-file'>File Materi Pembelajaran</Label>
              <Input
                accept='.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                disabled={generateExtractBusy || generateBusy}
                id='generate-material-file'
                type='file'
                onChange={(event) => void handleGenerateMaterialFileChange(event.target.files?.[0] ?? null)}
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
                placeholder='Upload file PDF/DOCX atau tempel teks materi yang sudah diberikan kepada siswa.'
                rows={7}
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
                placeholder='Contoh: fokus pada pemahaman konsep, bukan hafalan.'
                rows={3}
                value={generateBlueprint}
                onChange={(event) => setGenerateBlueprint(event.target.value)}
              />
            </div>

            {generateError ? <p className='rounded-md bg-destructive/10 p-3 text-sm text-destructive'>{generateError}</p> : null}

            <DialogFooter>
              <DialogClose asChild>
                <Button disabled={generateBusy} type='button' variant='outline'>Batal</Button>
              </DialogClose>
              <Button
                className='gap-0 overflow-hidden px-0'
                disabled={generateBusy}
                type='submit'>
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

      <Dialog open={Boolean(editQuestion)} onOpenChange={(open) => !open && setEditQuestion(null)}>
        <DialogContent className='max-h-[90vh] w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-3xl'>
          <DialogHeader>
            <DialogTitle>Edit Soal Bank</DialogTitle>
          </DialogHeader>

          <form className='space-y-4' onSubmit={handleEditSubmit}>
            <div className='grid gap-4 md:grid-cols-2'>
              <div className='space-y-2'>
                <Label htmlFor='edit-subject'>Mata Pelajaran</Label>
                <Input id='edit-subject' value={editSubject} onChange={(event) => setEditSubject(event.target.value)} />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='edit-grade'>Kelas</Label>
                <Input id='edit-grade' value={editGrade} onChange={(event) => setEditGrade(event.target.value)} />
              </div>
            </div>

            <div className='grid gap-4 md:grid-cols-2'>
              <div className='space-y-2'>
                <Label htmlFor='edit-type'>Tipe Soal</Label>
                <select
                  className='h-10 w-full rounded-md border bg-background px-3 text-sm'
                  id='edit-type'
                  value={editType}
                  onChange={(event) => setEditType(event.target.value)}>
                  <option value='multiple_choice'>Pilihan Ganda</option>
                  <option value='essay'>Essay</option>
                </select>
              </div>
              <div className='space-y-2'>
                <Label htmlFor='edit-difficulty'>Tingkat Kesulitan</Label>
                <select
                  className='h-10 w-full rounded-md border bg-background px-3 text-sm'
                  id='edit-difficulty'
                  value={editDifficulty}
                  onChange={(event) => setEditDifficulty(event.target.value)}>
                  <option value='easy'>Mudah</option>
                  <option value='medium'>Sedang</option>
                  <option value='hard'>Sulit</option>
                  <option value='mixed'>Campuran</option>
                </select>
              </div>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='edit-prompt'>Pertanyaan</Label>
              <Textarea id='edit-prompt' rows={5} value={editPrompt} onChange={(event) => setEditPrompt(event.target.value)} />
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
                    className='gap-0 overflow-hidden px-0'
                    disabled={editImageBusy || editImageDeleteBusy || editExplanationBusy || editBusy || Boolean(editImageJobID)}
                    size='sm'
                    type='button'
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
                    className='max-h-64 w-full bg-white object-contain'
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
                  <div className='grid gap-2 md:grid-cols-[80px_1fr_auto]' key={`${option.label}-${index}`}>
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
                        name='bank-edit-correct-answer'
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
              <Label htmlFor='edit-blueprint'>Kisi-kisi</Label>
              <Textarea id='edit-blueprint' rows={2} value={editBlueprintItem} onChange={(event) => setEditBlueprintItem(event.target.value)} />
            </div>

            <div className='space-y-2'>
              <div className='flex flex-wrap items-center justify-between gap-2'>
                <Label htmlFor='edit-explanation'>Pembahasan</Label>
                <div className='relative inline-flex rounded-md p-px align-middle'>
                  <Button
                    className='relative z-10 gap-0 overflow-hidden rounded-[calc(var(--radius-md)-1px)] bg-background px-0 leading-none shadow-none hover:bg-background disabled:opacity-80 dark:bg-background dark:hover:bg-background'
                    disabled={editExplanationBusy || editImageBusy || editImageDeleteBusy || editBusy}
                    size='sm'
                    type='button'
                    variant='outline'
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
    </div>
  )
}
