import { del, put } from '@vercel/blob'
import bcrypt from 'bcryptjs'
import { jwtVerify, SignJWT } from 'jose'
import JSZip from 'jszip'
import { NextRequest, NextResponse } from 'next/server'
import { Pool, type QueryResultRow } from 'pg'
import {
  buildImageGenerationPromptWithProvider,
  generateDiagramSVGWithProvider,
  generateQuestionsWithProvider,
} from '@/lib/ai-providers'

export const runtime = 'nodejs'

type RouteContext = {
  params: Promise<{ path?: string[] }>
}

type AuthUser = {
  id: string
  name: string
  email: string
  role: 'admin' | 'guru'
  status: 'active' | 'inactive'
  credit_balance?: number
}

type QuestionInput = {
  number?: number
  type?: string
  difficulty?: string
  prompt?: string
  image_url?: string
  correct_answer?: string
  explanation?: string
  blueprint_item?: string
  answer_options?: AnswerOptionInput[]
}

type AnswerOptionInput = {
  id?: string
  label?: string
  text?: string
  is_correct?: boolean
}

type GeneratedQuestion = {
  type?: string
  difficulty?: string
  prompt?: string
  image_url?: string
  correct_answer?: string
  explanation?: string
  blueprint_item?: string
  answer_options?: AnswerOptionInput[]
}

type PublicSubmissionInput = {
  student_name?: string
  student_identifier?: string
  answers?: {
    question_id?: string
    answer?: string
    is_correct?: boolean | null
  }[]
}

type JobCostDefault = {
  job_type: string
  display_name: string
  calculation_type: 'fixed' | 'per_question'
  unit_credit: number
  is_active: boolean
}

let dbPool: Pool | null = null
const jobNotificationClients = new Map<string, Set<ReadableStreamDefaultController<Uint8Array>>>()
const sseEncoder = new TextEncoder()

const defaultJobCosts: JobCostDefault[] = [
  {
    job_type: 'generate_questions',
    display_name: 'Generate Soal AI',
    calculation_type: 'per_question',
    unit_credit: 1,
    is_active: true,
  },
  {
    job_type: 'generate_explanation',
    display_name: 'Generate Pembahasan AI',
    calculation_type: 'fixed',
    unit_credit: 1,
    is_active: true,
  },
  {
    job_type: 'generate_question_image',
    display_name: 'Generate Gambar Soal AI',
    calculation_type: 'fixed',
    unit_credit: 5,
    is_active: true,
  },
]

function db() {
  if (!dbPool) {
    const connectionString = process.env.DATABASE_URL

    if (!connectionString) {
      throw new Error('DATABASE_URL wajib diisi untuk koneksi Supabase/Postgres.')
    }

    const isLocal = /localhost|127\.0\.0\.1/.test(connectionString)
    dbPool = new Pool({
      connectionString,
      ssl: isLocal ? false : { rejectUnauthorized: false },
    })
  }

  return dbPool
}

function postgresQuery(sql: string) {
  let index = 0
  return sql.replace(/\?/g, () => `$${++index}`)
}

async function execute(sql: string, args: readonly unknown[] = []) {
  return db().query(postgresQuery(sql), [...args])
}

async function first<T extends Record<string, unknown>>(sql: string, args: readonly unknown[] = []) {
  const result = await execute(sql, args)
  return (result.rows[0] as unknown as T | undefined) ?? null
}

async function all<T extends Record<string, unknown>>(sql: string, args: readonly unknown[] = []) {
  const result = await execute(sql, args)
  return result.rows as QueryResultRow[] as unknown as T[]
}

function data<T>(payload: T, init?: ResponseInit) {
  return NextResponse.json({ data: payload }, init)
}

function error(code: string, message: string, status = 400, details?: unknown) {
  return NextResponse.json({ error: { code, message, details } }, { status })
}

function now() {
  return new Date().toISOString()
}

function id(prefix: string) {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return `${prefix}_${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}`
}

async function body<T>(request: Request) {
  return (await request.json().catch(() => ({}))) as T
}

function textValue(row: Record<string, unknown>, key: string) {
  const value = row[key]
  return typeof value === 'string' ? value : value == null ? '' : String(value)
}

function intValue(row: Record<string, unknown>, key: string) {
  const value = row[key]
  return typeof value === 'number' ? value : Number(value ?? 0)
}

function boolValue(row: Record<string, unknown>, key: string) {
  return intValue(row, key) === 1 || row[key] === true
}

function publicUser(row: Record<string, unknown>): AuthUser {
  return {
    id: textValue(row, 'id'),
    name: textValue(row, 'name'),
    email: textValue(row, 'email'),
    role: textValue(row, 'role') === 'admin' ? 'admin' : 'guru',
    status: textValue(row, 'status') === 'inactive' ? 'inactive' : 'active',
    credit_balance: intValue(row, 'credit_balance'),
  }
}

function jwtSecret() {
  const secret = process.env.JWT_SECRET || process.env.AUTH_SECRET || 'teachery-development-secret'
  return new TextEncoder().encode(secret)
}

async function signToken(user: AuthUser) {
  return new SignJWT({ user_id: user.id, role: user.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(jwtSecret())
}

async function currentUser(request: Request, role?: 'admin' | 'guru') {
  const auth = request.headers.get('authorization') ?? ''
  const token = auth.startsWith('Bearer ')
    ? auth.slice(7)
    : new URL(request.url).searchParams.get('access_token') ?? ''

  if (!token) throw new AuthError('Sesi tidak valid. Silakan login ulang.')

  const verified = await jwtVerify(token, jwtSecret()).catch(() => null)
  const userID = verified?.payload.user_id

  if (typeof userID !== 'string') throw new AuthError('Sesi tidak valid. Silakan login ulang.')

  const row = await first<Record<string, unknown>>(
    `SELECT users.*, COALESCE(credit_balances.balance, 0) AS credit_balance
     FROM users
     LEFT JOIN credit_balances ON credit_balances.user_id = users.id
     WHERE users.id = ?`,
    [userID]
  )

  if (!row || textValue(row, 'status') !== 'active') {
    throw new AuthError('Sesi tidak valid. Silakan login ulang.')
  }

  const user = publicUser(row)
  if (role && user.role !== role) throw new AuthError('Akses ditolak.', 403)

  return user
}

class AuthError extends Error {
  status: number

  constructor(message: string, status = 401) {
    super(message)
    this.status = status
  }
}

async function audit(
  eventType: string,
  actor: AuthUser,
  metadata: Record<string, unknown> = {},
  targetUserID?: string,
  relatedAssessmentID?: string,
  relatedJobID?: string,
  relatedTransactionID?: string
) {
  await execute(
    `INSERT INTO audit_logs (
      id, event_type, actor_user_id, actor_role, target_user_id, related_job_id,
      related_transaction_id, related_assessment_id, metadata_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id('aud'),
      eventType,
      actor.id,
      actor.role,
      targetUserID ?? null,
      relatedJobID ?? null,
      relatedTransactionID ?? null,
      relatedAssessmentID ?? null,
      JSON.stringify(metadata),
      now(),
    ]
  )
}

async function getJobCost(jobType: string) {
  let cost = await first<Record<string, unknown>>(
    'SELECT * FROM job_credit_costs WHERE job_type = ? AND is_active = 1',
    [jobType]
  )

  cost ??= defaultJobCost(jobType)

  if (!cost) throw new Error(`Biaya job ${jobType} belum aktif.`)

  return {
    calculationType: textValue(cost, 'calculation_type') || 'fixed',
    unitCredit: intValue(cost, 'unit_credit') || 1,
  }
}

function defaultJobCost(jobType: string) {
  const cost = defaultJobCosts.find((item) => item.job_type === jobType && item.is_active)
  if (!cost) return null

  return {
    ...cost,
    is_active: cost.is_active ? 1 : 0,
  } satisfies Record<string, unknown>
}

async function chargeCredit(
  user: AuthUser,
  amount: number,
  type: 'ai_charge' | 'admin_add' | 'admin_subtract',
  reason: string,
  actor: AuthUser,
  jobID?: string,
  assessmentID?: string
) {
  if (amount === 0) return null

  const balanceRow = await first<Record<string, unknown>>(
    'SELECT balance FROM credit_balances WHERE user_id = ?',
    [user.id]
  )
  const currentBalance = intValue(balanceRow ?? {}, 'balance')
  const nextBalance = currentBalance + amount

  if (nextBalance < 0) {
    throw new Error('Kredit tidak cukup untuk menjalankan proses AI.')
  }

  const stamp = now()
  await execute(
    `INSERT INTO credit_balances (user_id, balance, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET balance = excluded.balance, updated_at = excluded.updated_at`,
    [user.id, nextBalance, stamp]
  )

  const transactionID = id('ctx')
  await execute(
    `INSERT INTO credit_transactions (
      id, user_id, amount, type, status, job_id, assessment_id, actor_user_id,
      actor_role, reason, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 'success', ?, ?, ?, ?, ?, ?, ?)`,
    [transactionID, user.id, amount, type, jobID ?? null, assessmentID ?? null, actor.id, actor.role, reason, stamp, stamp]
  )

  return transactionID
}

async function reservedCreditForUser(userID: string) {
  const row = await first<Record<string, unknown>>(
    `SELECT COALESCE(SUM(estimated_credit), 0) AS reserved_credit
     FROM jobs
     WHERE owner_user_id = ?
       AND status IN ('waiting', 'processing')
       AND credit_status IN ('reserved', 'not_charged')`,
    [userID]
  )

  return intValue(row ?? {}, 'reserved_credit')
}

async function ensureCreditAvailableForJob(user: AuthUser, estimatedCredit: number) {
  if (estimatedCredit <= 0) return

  const balanceRow = await first<Record<string, unknown>>(
    'SELECT balance FROM credit_balances WHERE user_id = ?',
    [user.id]
  )
  const balance = intValue(balanceRow ?? {}, 'balance')
  const reserved = await reservedCreditForUser(user.id)
  const available = balance - reserved

  if (available < estimatedCredit) {
    throw new Error(
      `Kredit tidak cukup. Saldo: ${balance}, sedang direservasi job berjalan: ${reserved}, tersedia: ${available}, dibutuhkan: ${estimatedCredit}.`
    )
  }
}

function normalizeImageMode(value: unknown): 'graphic' | 'diagram' {
  return value === 'diagram' ? 'diagram' : 'graphic'
}

async function login(request: Request) {
  const payload = await body<{ email?: string; password?: string }>(request)
  const email = payload.email?.trim().toLowerCase()
  const password = payload.password ?? ''

  if (!email || !password) return error('INVALID_CREDENTIALS', 'Email dan password wajib diisi.', 400)

  const row = await first<Record<string, unknown>>(
    `SELECT users.*, COALESCE(credit_balances.balance, 0) AS credit_balance
     FROM users
     LEFT JOIN credit_balances ON credit_balances.user_id = users.id
     WHERE lower(users.email) = ?`,
    [email]
  )

  if (!row || textValue(row, 'status') !== 'active') {
    return error('INVALID_CREDENTIALS', 'Email atau password tidak valid.', 401)
  }

  const ok = await bcrypt.compare(password, textValue(row, 'password_hash'))
  if (!ok) return error('INVALID_CREDENTIALS', 'Email atau password tidak valid.', 401)

  const user = publicUser(row)
  return data({ access_token: await signToken(user), user })
}

async function listAssessments(user: AuthUser) {
  const rows = await all<Record<string, unknown>>(
    `SELECT id, title, subject, grade, status, updated_at
     FROM assessments
     WHERE owner_user_id = ?
     ORDER BY updated_at DESC`,
    [user.id]
  )
  return data(rows.map(normalizeAssessmentRow))
}

async function createAssessment(request: Request, user: AuthUser) {
  const payload = await body<{ title?: string; subject?: string; grade?: string; creation_mode?: string }>(request)
  const title = payload.title?.trim()
  const subject = payload.subject?.trim()
  const grade = payload.grade?.trim()

  if (!title || !subject || !grade) return error('VALIDATION_ERROR', 'Judul, mata pelajaran, dan kelas wajib diisi.')

  const assessment = {
    id: id('asm'),
    owner_user_id: user.id,
    source_job_id: null,
    title,
    subject,
    grade,
    creation_mode: payload.creation_mode === 'ai' ? 'ai' : 'manual',
    material_text: null,
    material_source_filename: null,
    material_extracted_at: null,
    status: 'draft',
    created_at: now(),
    updated_at: now(),
  }

  await execute(
    `INSERT INTO assessments (
      id, owner_user_id, source_job_id, title, subject, grade, creation_mode,
      material_text, material_source_filename, material_extracted_at, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    Object.values(assessment)
  )
  await audit('assessment.created', user, { title }, undefined, assessment.id)

  return data(assessment, { status: 201 })
}

async function assessmentDetail(assessmentID: string, user: AuthUser) {
  const assessment = await first<Record<string, unknown>>(
    'SELECT * FROM assessments WHERE id = ? AND owner_user_id = ?',
    [assessmentID, user.id]
  )
  if (!assessment) return error('NOT_FOUND', 'Assessment tidak ditemukan.', 404)

  const questions = await questionsForAssessment(assessmentID)
  return data({ ...normalizeAssessmentRow(assessment), questions })
}

async function questionBank(request: Request, user: AuthUser) {
  const params = new URL(request.url).searchParams
  const limit = Math.min(Math.max(Number(params.get('limit') ?? 20), 1), 50)
  const offset = Math.max(Number(params.get('offset') ?? 0), 0)
  const search = params.get('q')?.trim().toLowerCase() ?? ''
  const subject = params.get('subject')?.trim() ?? ''
  const grade = params.get('grade')?.trim() ?? ''
  const type = params.get('type')?.trim() ?? ''
  const difficulty = params.get('difficulty')?.trim() ?? ''

  const where: string[] = []
  const args: unknown[] = []

  if (user.role !== 'admin') {
    where.push('q.owner_user_id = ?')
    args.push(user.id)
  }
  if (search) {
    where.push(
      `(LOWER(q.prompt) LIKE ?
        OR LOWER(q.subject) LIKE ?
        OR LOWER(q.grade) LIKE ?
        OR LOWER(COALESCE(qc.name, '')) LIKE ?
        OR LOWER(COALESCE(q.blueprint_item, '')) LIKE ?
        OR LOWER(COALESCE(q.correct_answer, '')) LIKE ?
        OR LOWER(COALESCE(q.tags_json, '')) LIKE ?)`
    )
    args.push(...Array(7).fill(`%${search}%`))
  }
  if (subject) {
    where.push('q.subject = ?')
    args.push(subject)
  }
  if (grade) {
    where.push('q.grade = ?')
    args.push(grade)
  }
  if (type === 'multiple_choice' || type === 'essay') {
    where.push('q.type = ?')
    args.push(type)
  }
  if (difficulty === 'easy' || difficulty === 'medium' || difficulty === 'hard' || difficulty === 'mixed') {
    where.push('q.difficulty = ?')
    args.push(difficulty)
  }

  const whereSQL = where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''
  const totalRow = await first<Record<string, unknown>>(
    `SELECT COUNT(*) AS total
     FROM questions q
     LEFT JOIN question_categories qc ON qc.id = q.category_id
     ${whereSQL}`,
    args
  )
  const total = intValue(totalRow ?? {}, 'total')
  const questions = await all<Record<string, unknown>>(
    `SELECT q.*, qc.name AS category_name, users.name AS owner_name,
      (SELECT COUNT(*) FROM assessment_questions aq WHERE aq.question_id = q.id) AS assessment_count
     FROM questions q
     LEFT JOIN question_categories qc ON qc.id = q.category_id
     LEFT JOIN users ON users.id = q.owner_user_id
     ${whereSQL}
     ORDER BY q.updated_at DESC, q.id DESC
     LIMIT ? OFFSET ?`,
    [...args, limit, offset]
  )
  const questionIDs = questions.map((question) => textValue(question, 'id')).filter(Boolean)
  const options =
    questionIDs.length > 0
      ? await all<Record<string, unknown>>(
          `SELECT * FROM answer_options
           WHERE question_id IN (${questionIDs.map(() => '?').join(', ')})
           ORDER BY question_id, label`,
          questionIDs
        )
      : []

  return data({
    questions: questions.map((question) => ({
      ...question,
      assessment_count: intValue(question, 'assessment_count'),
      answer_options: options
        .filter((option) => textValue(option, 'question_id') === textValue(question, 'id'))
        .map((option) => ({ ...option, is_correct: boolValue(option, 'is_correct') })),
    })),
    total,
    limit,
    offset,
    next_offset: offset + questions.length,
    has_more: offset + questions.length < total,
  })
}

async function questionCategories(user: AuthUser) {
  const ownerWhere = user.role === 'admin' ? '' : 'WHERE owner_user_id = ?'
  const args = user.role === 'admin' ? [] : [user.id]
  const rows = await all<Record<string, unknown>>(
    `SELECT id, name, subject, grade, owner_user_id, created_at, updated_at
     FROM question_categories
     ${ownerWhere}
     ORDER BY LOWER(name) ASC, created_at ASC`,
    args
  )

  return data(rows)
}

async function createQuestionCategory(request: Request, user: AuthUser) {
  const payload = await body<{ name?: string; subject?: string; grade?: string }>(request)
  const name = payload.name?.trim()
  if (!name) return error('VALIDATION_ERROR', 'Nama kategori wajib diisi.')

  const categoryID = id('qcat')
  const stamp = now()
  await execute(
    `INSERT INTO question_categories (
      id, owner_user_id, name, subject, grade, parent_category_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, NULL, ?, ?)`,
    [
      categoryID,
      user.id,
      name,
      payload.subject?.trim() || null,
      payload.grade?.trim() || null,
      stamp,
      stamp,
    ]
  )

  const row = await first<Record<string, unknown>>(
    'SELECT id, name, subject, grade, owner_user_id, created_at, updated_at FROM question_categories WHERE id = ?',
    [categoryID]
  )
  return data(row, { status: 201 })
}

async function questionBankQuestion(questionID: string, user: AuthUser) {
  const ownerWhere = user.role === 'admin' ? '' : 'AND q.owner_user_id = ?'
  const args = user.role === 'admin' ? [questionID] : [questionID, user.id]
  const question = await first<Record<string, unknown>>(
    `SELECT q.*, qc.name AS category_name, users.name AS owner_name,
      (SELECT COUNT(*) FROM assessment_questions aq WHERE aq.question_id = q.id) AS assessment_count
     FROM questions q
     LEFT JOIN question_categories qc ON qc.id = q.category_id
     LEFT JOIN users ON users.id = q.owner_user_id
     WHERE q.id = ? ${ownerWhere}`,
    args
  )

  if (!question) return null

  const options = await all<Record<string, unknown>>(
    'SELECT * FROM answer_options WHERE question_id = ? ORDER BY label',
    [questionID]
  )

  return {
    ...question,
    assessment_count: intValue(question, 'assessment_count'),
    answer_options: options.map((option) => ({ ...option, is_correct: boolValue(option, 'is_correct') })),
  }
}

function normalizedAssessmentStatus(status: string) {
  return status === 'published' || status === 'ready_to_export' || status === 'pdf_ready'
    ? 'published'
    : 'draft'
}

function normalizeAssessmentRow<T extends Record<string, unknown>>(row: T) {
  return {
    ...row,
    status: normalizedAssessmentStatus(textValue(row, 'status')),
  }
}

function assessmentIsPublished(row: Record<string, unknown>) {
  return normalizedAssessmentStatus(textValue(row, 'status')) === 'published'
}

async function updateQuestionBankQuestion(request: Request, questionID: string, user: AuthUser) {
  const existing = await questionBankQuestion(questionID, user)
  if (!existing) return error('NOT_FOUND', 'Soal tidak ditemukan.', 404)

  const payload = await body<QuestionInput & { subject?: string; grade?: string }>(request)
  const questionType = payload.type === 'essay' ? 'essay' : 'multiple_choice'
  const difficulty = normalizeDifficulty(payload.difficulty)
  const subject = payload.subject?.trim() || textValue(existing, 'subject')
  const grade = payload.grade?.trim() || textValue(existing, 'grade')
  const prompt = payload.prompt?.trim() ?? ''

  if (!prompt) return error('VALIDATION_ERROR', 'Pertanyaan wajib diisi.')
  if (questionType === 'multiple_choice') {
    const options = payload.answer_options ?? []
    if (options.length < 2 || options.some((option) => !option.text?.trim())) {
      return error('VALIDATION_ERROR', 'Pilihan ganda wajib memiliki minimal dua opsi yang terisi.')
    }
    if (!options.some((option) => option.is_correct)) {
      return error('VALIDATION_ERROR', 'Pilih satu jawaban benar.')
    }
  }

  const correctAnswer =
    questionType === 'multiple_choice'
      ? correctLabel(payload.answer_options) || payload.correct_answer || ''
      : payload.correct_answer || ''
  const stamp = now()
  const ownerWhere = user.role === 'admin' ? '' : 'AND owner_user_id = ?'
  const args =
    user.role === 'admin'
      ? [
          subject,
          grade,
          questionType,
          difficulty,
          prompt,
          payload.image_url?.trim() || null,
          correctAnswer,
          payload.explanation?.trim() || null,
          payload.blueprint_item?.trim() || null,
          stamp,
          questionID,
        ]
      : [
          subject,
          grade,
          questionType,
          difficulty,
          prompt,
          payload.image_url?.trim() || null,
          correctAnswer,
          payload.explanation?.trim() || null,
          payload.blueprint_item?.trim() || null,
          stamp,
          questionID,
          user.id,
        ]

  await execute(
    `UPDATE questions
     SET subject = ?, grade = ?, type = ?, difficulty = ?, prompt = ?, image_url = ?,
         correct_answer = ?, explanation = ?, blueprint_item = ?, updated_at = ?
     WHERE id = ? ${ownerWhere}`,
    args
  )

  await execute('DELETE FROM answer_options WHERE question_id = ?', [questionID])
  if (questionType === 'multiple_choice') await replaceOptions(questionID, payload.answer_options ?? [])

  return data(await questionBankQuestion(questionID, user))
}

async function deleteQuestionBankQuestion(questionID: string, user: AuthUser) {
  const existing = await questionBankQuestion(questionID, user)
  if (!existing) return error('NOT_FOUND', 'Soal tidak ditemukan.', 404)

  const assessmentCount = await first<Record<string, unknown>>(
    'SELECT COUNT(*) AS total FROM assessment_questions WHERE question_id = ?',
    [questionID]
  )
  if (intValue(assessmentCount ?? {}, 'total') > 0) {
    return error('RESOURCE_IN_USE', 'Soal masih dipakai assessment dan tidak dapat dihapus.', 409)
  }

  const imageURL = textValue(existing, 'image_url')
  await deleteManagedBlob(imageURL).catch(() => undefined)
  await execute('DELETE FROM answer_options WHERE question_id = ?', [questionID])

  const ownerWhere = user.role === 'admin' ? '' : 'AND owner_user_id = ?'
  const args = user.role === 'admin' ? [questionID] : [questionID, user.id]
  await execute(`DELETE FROM questions WHERE id = ? ${ownerWhere}`, args)

  return data({ success: true })
}

async function updateQuestionBankQuestionCategory(request: Request, questionID: string, user: AuthUser) {
  const existing = await questionBankQuestion(questionID, user)
  if (!existing) return error('NOT_FOUND', 'Soal tidak ditemukan.', 404)

  const payload = await body<{ category_id?: string | null }>(request)
  const categoryID = payload.category_id?.trim() || null

  if (categoryID) {
    const categoryWhere = user.role === 'admin' ? 'id = ?' : 'id = ? AND owner_user_id = ?'
    const categoryArgs = user.role === 'admin' ? [categoryID] : [categoryID, user.id]
    const category = await first<Record<string, unknown>>(
      `SELECT id FROM question_categories WHERE ${categoryWhere}`,
      categoryArgs
    )
    if (!category) return error('NOT_FOUND', 'Kategori tidak ditemukan.', 404)
  }

  const ownerWhere = user.role === 'admin' ? '' : 'AND owner_user_id = ?'
  const args = user.role === 'admin' ? [categoryID, now(), questionID] : [categoryID, now(), questionID, user.id]
  await execute(
    `UPDATE questions SET category_id = ?, updated_at = ? WHERE id = ? ${ownerWhere}`,
    args
  )

  return data(await questionBankQuestion(questionID, user))
}

async function generateQuestionBankQuestions(request: Request, user: AuthUser) {
  const input = await body<Record<string, unknown>>(request)
  const subject = typeof input.subject === 'string' ? input.subject.trim() : ''
  const grade = typeof input.grade === 'string' ? input.grade.trim() : ''
  const categoryID = typeof input.category_id === 'string' && input.category_id.trim() ? input.category_id.trim() : null
  const count = Number(input.question_count ?? 0)
  const materialText = typeof input.material_text === 'string' ? input.material_text.trim() : ''

  if (!subject || !grade || !count || count < 1 || !materialText) {
    return error('VALIDATION_ERROR', 'Mata pelajaran, kelas, jumlah soal, dan materi wajib diisi.')
  }

  if (categoryID) {
    const categoryWhere = user.role === 'admin' ? 'id = ?' : 'id = ? AND owner_user_id = ?'
    const categoryArgs = user.role === 'admin' ? [categoryID] : [categoryID, user.id]
    const category = await first<Record<string, unknown>>(
      `SELECT id FROM question_categories WHERE ${categoryWhere}`,
      categoryArgs
    )
    if (!category) return error('NOT_FOUND', 'Kategori tidak ditemukan.', 404)
  }

  const cost = await getJobCost('generate_questions')
  const estimate = cost.calculationType === 'per_question' ? cost.unitCredit * count : cost.unitCredit
  await ensureCreditAvailableForJob(user, estimate)
  const jobID = id('job')
  const stamp = now()
  const inputSnapshot = {
    ...input,
    question_bank: true,
    subject,
    grade,
    category_id: categoryID,
    material_text: materialText,
  }

  await execute(
    `INSERT INTO jobs (
      id, owner_user_id, type, status, input_snapshot_json, estimated_credit,
      actual_credit, credit_status, error_message, created_at, updated_at, completed_at
    ) VALUES (?, ?, 'generate_questions', 'processing', ?, ?, 0, 'reserved', NULL, ?, ?, NULL)`,
    [jobID, user.id, JSON.stringify(inputSnapshot), estimate, stamp, stamp]
  )
  await emitJobUpdated(user.id, jobID)

  void processQuestionBankGenerateJob({
    jobID,
    user,
    inputSnapshot,
    count,
    subject,
    grade,
    categoryID,
    costCalculationType: cost.calculationType === 'per_question' ? 'per_question' : 'fixed',
    costUnitCredit: cost.unitCredit,
  })

  return data({ job: await jobByID(jobID), questions: [], queued: true }, { status: 202 })
}

async function processQuestionBankGenerateJob({
  jobID,
  user,
  inputSnapshot,
  count,
  subject,
  grade,
  categoryID,
  costCalculationType,
  costUnitCredit,
}: {
  jobID: string
  user: AuthUser
  inputSnapshot: Record<string, unknown>
  count: number
  subject: string
  grade: string
  categoryID: string | null
  costCalculationType: 'fixed' | 'per_question'
  costUnitCredit: number
}) {
  try {
    const generated = await generateQuestionsWithAI(inputSnapshot)
    const generatedQuestions = generated.slice(0, count)
    const questions: unknown[] = []

    for (const generatedQuestion of generatedQuestions) {
      const question = await insertQuestionBankQuestion(
        mapGeneratedQuestion(generatedQuestion, inputSnapshot),
        user,
        subject,
        grade,
        categoryID,
        'ai'
      )
      if (question) questions.push(question)
    }

    const actualCredit = costCalculationType === 'per_question' ? costUnitCredit * questions.length : costUnitCredit
    await chargeCredit(user, -actualCredit, 'ai_charge', 'Generate soal bank dengan AI.', user, jobID)
    await execute(
      `UPDATE jobs SET status = 'completed', actual_credit = ?, credit_status = 'charged',
       updated_at = ?, completed_at = ? WHERE id = ?`,
      [actualCredit, now(), now(), jobID]
    )
    await audit('job.completed', user, { type: 'generate_questions', question_bank: true, actual_credit: actualCredit }, undefined, undefined, jobID)
    await emitJobUpdated(user.id, jobID)
  } catch (err) {
    await execute(
      `UPDATE jobs SET status = 'failed', credit_status = 'refunded', error_message = ?, updated_at = ?, completed_at = ? WHERE id = ?`,
      [err instanceof Error ? err.message : 'Job gagal diproses.', now(), now(), jobID]
    )
    await emitJobUpdated(user.id, jobID)
  }
}

async function insertQuestionBankQuestion(
  input: QuestionInput,
  user: AuthUser,
  subject: string,
  grade: string,
  categoryID: string | null,
  source: 'manual' | 'ai' | 'import' = 'manual'
) {
  const stamp = now()
  const questionID = id('qst')
  const questionType = input.type === 'essay' ? 'essay' : 'multiple_choice'
  const difficulty = normalizeDifficulty(input.difficulty)
  const correctAnswer =
    questionType === 'multiple_choice'
      ? correctLabel(input.answer_options) || input.correct_answer || ''
      : input.correct_answer || ''

  await execute(
    `INSERT INTO questions (
      id, owner_user_id, category_id, subject, grade, type, difficulty, prompt, image_url,
      correct_answer, explanation, blueprint_item, tags_json, source, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      questionID,
      user.id,
      categoryID,
      subject,
      grade,
      questionType,
      difficulty,
      input.prompt?.trim() ?? '',
      input.image_url?.trim() || null,
      correctAnswer,
      input.explanation?.trim() || null,
      input.blueprint_item?.trim() || null,
      null,
      source,
      stamp,
      stamp,
    ]
  )

  if (questionType === 'multiple_choice') {
    await replaceOptions(questionID, input.answer_options ?? [])
  }

  return questionBankQuestion(questionID, user)
}

async function generateQuestionBankExplanation(request: Request, questionID: string, user: AuthUser) {
  const question = await questionBankQuestion(questionID, user)
  if (!question) return error('NOT_FOUND', 'Soal tidak ditemukan.', 404)

  const payload = await body<{ question_text?: string }>(request)
  const questionText = payload.question_text?.trim() || textValue(question, 'prompt')
  if (!questionText) return error('VALIDATION_ERROR', 'Teks soal wajib diisi.')

  const cost = await getJobCost('generate_explanation')
  await ensureCreditAvailableForJob(user, cost.unitCredit)
  const jobID = id('job')
  const stamp = now()

  await execute(
    `INSERT INTO jobs (
      id, owner_user_id, type, status, input_snapshot_json, estimated_credit,
      actual_credit, credit_status, error_message, created_at, updated_at, completed_at
    ) VALUES (?, ?, 'generate_explanation', 'processing', ?, ?, 0, 'reserved', NULL, ?, ?, NULL)`,
    [jobID, user.id, JSON.stringify({ question_bank_id: questionID }), cost.unitCredit, stamp, stamp]
  )

  try {
    const apiKey = process.env.SUMOPOD_API_KEY
    if (!apiKey) throw new Error('SUMOPOD_API_KEY belum diisi.')

    const model = process.env.SUMOPOD_EXPLANATION_MODEL || process.env.SUMOPOD_MODEL || 'gpt-4o-mini'
    const apiURL = process.env.SUMOPOD_API_URL || 'https://ai.sumopod.com/v1/chat/completions'
    const explanationMaxTokens = Number(process.env.SUMOPOD_EXPLANATION_MAX_TOKENS ?? 1200)
    const explanation = await callSumopod(apiURL, apiKey, model, buildExplanationPrompt(questionText), explanationMaxTokens, 0.2)
    const ownerWhere = user.role === 'admin' ? '' : 'AND owner_user_id = ?'
    const args = user.role === 'admin' ? [explanation, now(), questionID] : [explanation, now(), questionID, user.id]

    await execute(
      `UPDATE questions SET explanation = ?, updated_at = ? WHERE id = ? ${ownerWhere}`,
      args
    )
    await chargeCredit(user, -cost.unitCredit, 'ai_charge', 'Generate pembahasan soal bank dengan AI.', user, jobID)
    await execute(
      `UPDATE jobs SET status = 'completed', actual_credit = ?, credit_status = 'charged',
       updated_at = ?, completed_at = ? WHERE id = ?`,
      [cost.unitCredit, now(), now(), jobID]
    )
    await audit('job.completed', user, { type: 'generate_explanation', question_bank_id: questionID, actual_credit: cost.unitCredit }, undefined, undefined, jobID)

    return data({ job: await jobByID(jobID), explanation })
  } catch (err) {
    await execute(
      `UPDATE jobs SET status = 'failed', credit_status = 'refunded', error_message = ?, updated_at = ?, completed_at = ? WHERE id = ?`,
      [err instanceof Error ? err.message : 'Generate pembahasan gagal diproses.', now(), now(), jobID]
    )
    throw err
  }
}

async function generateQuestionBankImage(request: Request, questionID: string, user: AuthUser) {
  const question = await questionBankQuestion(questionID, user)
  if (!question) return error('NOT_FOUND', 'Soal tidak ditemukan.', 404)

  const payload = await body<{
    question_text?: string
    instructions?: string
    use_reference_image?: boolean
    image_mode?: string
  }>(request)
  const questionText = payload.question_text?.trim() || textValue(question, 'prompt')
  if (!questionText) return error('VALIDATION_ERROR', 'Teks soal wajib diisi.')
  const imageMode = normalizeImageMode(payload.image_mode)

  const cost = await getJobCost('generate_question_image')
  await ensureCreditAvailableForJob(user, cost.unitCredit)
  const jobID = id('job')
  const stamp = now()
  const inputSnapshot = {
    question_bank_id: questionID,
    question_text: questionText,
    instructions: payload.instructions?.trim() ?? '',
    image_mode: imageMode,
    use_reference_image: imageMode === 'graphic' && Boolean(payload.use_reference_image),
  }

  await execute(
    `INSERT INTO jobs (
      id, owner_user_id, type, status, input_snapshot_json, estimated_credit,
      actual_credit, credit_status, error_message, created_at, updated_at, completed_at
    ) VALUES (?, ?, 'generate_question_image', 'processing', ?, ?, 0, 'reserved', NULL, ?, ?, NULL)`,
    [jobID, user.id, JSON.stringify(inputSnapshot), cost.unitCredit, stamp, stamp]
  )
  await emitJobUpdated(user.id, jobID)

  void processQuestionBankImageJob({
    jobID,
    questionID,
    question,
    user,
    questionText,
    instructions: payload.instructions?.trim() ?? '',
    imageMode,
    useReferenceImage: imageMode === 'graphic' && Boolean(payload.use_reference_image),
    costUnitCredit: cost.unitCredit,
  })

  return data({ job: await jobByID(jobID), queued: true }, { status: 202 })
}

async function processQuestionBankImageJob({
  jobID,
  questionID,
  question,
  user,
  questionText,
  instructions,
  imageMode,
  useReferenceImage,
  costUnitCredit,
}: {
  jobID: string
  questionID: string
  question: Record<string, unknown>
  user: AuthUser
  questionText: string
  instructions: string
  imageMode: 'graphic' | 'diagram'
  useReferenceImage: boolean
  costUnitCredit: number
}) {
  try {
    const existingImageURL = textValue(question, 'image_url')
    const referenceImageURL = useReferenceImage ? existingImageURL : ''
    const subject = textValue(question, 'subject')
    const grade = textValue(question, 'grade')
    const imageBytes =
      imageMode === 'diagram'
        ? await generateDiagramPngWithOpenAI({ questionText, subject, grade, instructions })
        : await generateImageIllustrationWithOpenAI({
            questionText,
            subject,
            grade,
            instructions,
            referenceImageURL,
          })
    const imageURL = await uploadQuestionImage('question-bank', questionID, imageBytes)
    await deleteManagedBlob(existingImageURL).catch(() => undefined)

    const ownerWhere = user.role === 'admin' ? '' : 'AND owner_user_id = ?'
    const args = user.role === 'admin' ? [imageURL, now(), questionID] : [imageURL, now(), questionID, user.id]
    await execute(
      `UPDATE questions SET image_url = ?, updated_at = ? WHERE id = ? ${ownerWhere}`,
      args
    )
    await chargeCredit(user, -costUnitCredit, 'ai_charge', 'Generate gambar ilustrasi soal bank dengan AI.', user, jobID)
    await execute(
      `UPDATE jobs SET status = 'completed', actual_credit = ?, credit_status = 'charged',
       updated_at = ?, completed_at = ? WHERE id = ?`,
      [costUnitCredit, now(), now(), jobID]
    )
    await audit('job.completed', user, { type: 'generate_question_image', question_bank_id: questionID, actual_credit: costUnitCredit }, undefined, undefined, jobID)
    await emitJobUpdated(user.id, jobID)
  } catch (err) {
    await execute(
      `UPDATE jobs SET status = 'failed', credit_status = 'refunded', error_message = ?, updated_at = ?, completed_at = ? WHERE id = ?`,
      [err instanceof Error ? err.message : 'Generate gambar gagal diproses.', now(), now(), jobID]
    )
    await emitJobUpdated(user.id, jobID)
  }
}

async function deleteQuestionBankImage(questionID: string, user: AuthUser) {
  const question = await questionBankQuestion(questionID, user)
  if (!question) return error('NOT_FOUND', 'Soal tidak ditemukan.', 404)

  const imageURL = textValue(question, 'image_url')
  await deleteManagedBlob(imageURL)
  const ownerWhere = user.role === 'admin' ? '' : 'AND owner_user_id = ?'
  const args = user.role === 'admin' ? [now(), questionID] : [now(), questionID, user.id]
  await execute(
    `UPDATE questions SET image_url = NULL, updated_at = ? WHERE id = ? ${ownerWhere}`,
    args
  )

  return data({ success: true })
}

async function deleteAssessment(assessmentID: string, user: AuthUser) {
  await ensureAssessmentPublishTables()
  await ensureAssessmentOwner(assessmentID, user)
  const questionCount = await first<Record<string, unknown>>(
    'SELECT COUNT(*) AS total FROM assessment_questions WHERE assessment_id = ?',
    [assessmentID]
  )
  await execute('UPDATE credit_transactions SET assessment_id = NULL, updated_at = ? WHERE assessment_id = ?', [
    now(),
    assessmentID,
  ])
  await execute('UPDATE audit_logs SET related_assessment_id = NULL WHERE related_assessment_id = ?', [assessmentID])
  await execute('DELETE FROM exports WHERE assessment_id = ?', [assessmentID])
  await execute('DELETE FROM assessment_submissions WHERE assessment_id = ?', [assessmentID])
  await execute('DELETE FROM assessment_publications WHERE assessment_id = ?', [assessmentID])
  await execute('DELETE FROM assessments WHERE id = ? AND owner_user_id = ?', [assessmentID, user.id])
  await audit('assessment.deleted', user, { assessment_id: assessmentID, question_count: intValue(questionCount ?? {}, 'total') })

  return data({ success: true })
}

async function ensureAssessmentPublishTables() {
  await execute(
    `CREATE TABLE IF NOT EXISTS assessment_publications (
      assessment_id TEXT PRIMARY KEY,
      public_slug TEXT NOT NULL UNIQUE,
      public_url TEXT,
      status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'closed')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`
  )
  await execute(
    `CREATE TABLE IF NOT EXISTS assessment_submissions (
      id TEXT PRIMARY KEY,
      assessment_id TEXT NOT NULL,
      student_name TEXT NOT NULL,
      student_identifier TEXT,
      score INTEGER,
      total_questions INTEGER NOT NULL,
      scored_questions INTEGER NOT NULL DEFAULT 0,
      answers_json TEXT NOT NULL,
      submitted_at TEXT NOT NULL
    )`
  )
}

function publicSlug() {
  const bytes = crypto.getRandomValues(new Uint8Array(10))
  return Array.from(bytes, (byte) => byte.toString(36).padStart(2, '0')).join('')
}

function publicAssessmentURL(request: Request, slug: string) {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    request.headers.get('origin') ||
    `${new URL(request.url).protocol}//${new URL(request.url).host}`

  return `${base.replace(/\/$/, '')}/student/assessments/${slug}`
}

async function publishAssessment(request: Request, assessmentID: string, user: AuthUser) {
  await ensureAssessmentPublishTables()
  await ensureAssessmentOwner(assessmentID, user)
  const questionCount = await first<Record<string, unknown>>(
    'SELECT COUNT(*) AS total FROM assessment_questions WHERE assessment_id = ?',
    [assessmentID]
  )

  if (intValue(questionCount ?? {}, 'total') === 0) {
    return error('VALIDATION_ERROR', 'Assessment belum memiliki pertanyaan.')
  }

  const stamp = now()
  const existing = await first<Record<string, unknown>>(
    'SELECT * FROM assessment_publications WHERE assessment_id = ?',
    [assessmentID]
  )
  const slug = existing ? textValue(existing, 'public_slug') : publicSlug()
  const url = publicAssessmentURL(request, slug)

  if (existing) {
    await execute(
      'UPDATE assessment_publications SET public_url = ?, status = ?, updated_at = ? WHERE assessment_id = ?',
      [url, 'published', stamp, assessmentID]
    )
  } else {
    await execute(
      `INSERT INTO assessment_publications (
        assessment_id, public_slug, public_url, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [assessmentID, slug, url, 'published', stamp, stamp]
    )
  }

  await execute('UPDATE assessments SET status = ?, updated_at = ? WHERE id = ? AND owner_user_id = ?', [
    'published',
    stamp,
    assessmentID,
    user.id,
  ])
  await audit('assessment.published', user, { assessment_id: assessmentID, public_slug: slug }, undefined, assessmentID)

  const assessment = await first<Record<string, unknown>>(
    'SELECT id, title, subject, grade, status, updated_at FROM assessments WHERE id = ?',
    [assessmentID]
  )

  return data({ ...normalizeAssessmentRow(assessment ?? {}), public_slug: slug, public_url: url })
}

async function publicAssessment(slug: string) {
  await ensureAssessmentPublishTables()
  const publication = await first<Record<string, unknown>>(
    `SELECT assessment_publications.*, assessments.title, assessments.subject, assessments.grade, assessments.status AS assessment_status
     FROM assessment_publications
     JOIN assessments ON assessments.id = assessment_publications.assessment_id
     WHERE assessment_publications.public_slug = ? AND assessment_publications.status = ?`,
    [slug, 'published']
  )

  if (!publication) return error('NOT_FOUND', 'Assessment publik tidak ditemukan.', 404)

  const assessmentID = textValue(publication, 'assessment_id')
  const questions = await questionsForAssessment(assessmentID)

  return data({
    id: assessmentID,
    title: textValue(publication, 'title'),
    subject: textValue(publication, 'subject'),
    grade: textValue(publication, 'grade'),
    public_slug: slug,
    questions: questions.map((question) => {
      const row = question as Record<string, unknown>
      const options = Array.isArray(row.answer_options) ? row.answer_options : []

      return {
        id: textValue(row, 'id'),
        number: intValue(row, 'number'),
        type: textValue(row, 'type'),
        difficulty: textValue(row, 'difficulty'),
        prompt: textValue(row, 'prompt'),
        image_url: textValue(row, 'image_url') || null,
        answer_options: options.map((option) => {
          const optionRow = option as Record<string, unknown>
          return {
            id: textValue(optionRow, 'id'),
            label: textValue(optionRow, 'label'),
            text: textValue(optionRow, 'text'),
          }
        }),
      }
    }),
  })
}

async function submitPublicAssessment(request: Request, slug: string) {
  await ensureAssessmentPublishTables()
  const payload = await body<PublicSubmissionInput>(request)
  const studentName = payload.student_name?.trim()

  if (!studentName) return error('VALIDATION_ERROR', 'Nama siswa wajib diisi.')

  const publication = await first<Record<string, unknown>>(
    'SELECT * FROM assessment_publications WHERE public_slug = ? AND status = ?',
    [slug, 'published']
  )
  if (!publication) return error('NOT_FOUND', 'Assessment publik tidak ditemukan.', 404)

  const assessmentID = textValue(publication, 'assessment_id')
  const questions = await questionsForAssessment(assessmentID)
  const answers = Array.isArray(payload.answers) ? payload.answers : []
  const answerMap = new Map(
    answers
      .filter((answer) => answer.question_id)
      .map((answer) => [answer.question_id ?? '', (answer.answer ?? '').trim()])
  )

  let score = 0
  let scoredQuestions = 0
  for (const question of questions) {
    const row = question as Record<string, unknown>
    if (textValue(row, 'type') !== 'multiple_choice') continue

    scoredQuestions += 1
    const submitted = answerMap.get(textValue(row, 'id'))?.toUpperCase() ?? ''
    const correct = textValue(row, 'correct_answer').trim().toUpperCase()
    if (submitted && submitted === correct) score += 1
  }

  const submittedAt = now()
  const submission = {
    id: id('sub'),
    assessment_id: assessmentID,
    student_name: studentName,
    student_identifier: payload.student_identifier?.trim() || null,
    score,
    total_questions: questions.length,
    scored_questions: scoredQuestions,
    answers_json: JSON.stringify(answers),
    submitted_at: submittedAt,
  }

  await execute(
    `INSERT INTO assessment_submissions (
      id, assessment_id, student_name, student_identifier, score, total_questions,
      scored_questions, answers_json, submitted_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    Object.values(submission)
  )

  return data({
    id: submission.id,
    score,
    total_questions: questions.length,
    scored_questions: scoredQuestions,
    submitted_at: submittedAt,
  }, { status: 201 })
}

async function assessmentSubmissions(assessmentID: string, user: AuthUser) {
  await ensureAssessmentPublishTables()
  const assessment = await ensureAssessmentOwner(assessmentID, user)
  const questions = await questionsForAssessment(assessmentID)
  const submissions = await all<Record<string, unknown>>(
    'SELECT * FROM assessment_submissions WHERE assessment_id = ? ORDER BY submitted_at DESC',
    [assessmentID]
  )

  const questionMap = new Map(
    questions.map((question) => {
      const row = question as Record<string, unknown>
      return [textValue(row, 'id'), row]
    })
  )

  return data({
    assessment: {
      id: textValue(assessment, 'id'),
      title: textValue(assessment, 'title'),
      subject: textValue(assessment, 'subject'),
      grade: textValue(assessment, 'grade'),
      status: textValue(assessment, 'status'),
    },
    submissions: submissions.map((submission) => {
      const rawAnswers = parseSubmissionAnswers(textValue(submission, 'answers_json'))

      return {
        id: textValue(submission, 'id'),
        student_name: textValue(submission, 'student_name'),
        student_identifier: textValue(submission, 'student_identifier'),
        score: intValue(submission, 'score'),
        total_questions: intValue(submission, 'total_questions'),
        scored_questions: intValue(submission, 'scored_questions'),
        submitted_at: textValue(submission, 'submitted_at'),
        answers: rawAnswers.map((answer) => {
          const question = questionMap.get(answer.question_id)
          const options = Array.isArray(question?.answer_options) ? question.answer_options : []
          const selectedOption = options.find((option) => {
            const row = option as Record<string, unknown>
            return textValue(row, 'label') === answer.answer
          }) as Record<string, unknown> | undefined

          return {
            question_id: answer.question_id,
            question_number: question ? intValue(question, 'number') : 0,
            question_type: question ? textValue(question, 'type') : '',
            question_prompt: question ? textValue(question, 'prompt') : '',
            submitted_answer: answer.answer,
            submitted_answer_text: selectedOption ? textValue(selectedOption, 'text') : answer.answer,
            correct_answer: question ? textValue(question, 'correct_answer') : '',
            is_correct: answerCorrectness(answer, question),
          }
        }).sort((a, b) => a.question_number - b.question_number),
      }
    }),
  })
}

async function reviewSubmissionAnswer(
  request: Request,
  assessmentID: string,
  submissionID: string,
  questionID: string,
  user: AuthUser
) {
  await ensureAssessmentPublishTables()
  await ensureDraftAssessmentOwner(assessmentID, user)

  const payload = await body<{ is_correct?: boolean }>(request)
  if (typeof payload.is_correct !== 'boolean') {
    return error('VALIDATION_ERROR', 'Status review jawaban wajib bernilai benar atau salah.')
  }

  const question = await first<Record<string, unknown>>(
    `SELECT q.*, aq.number
     FROM assessment_questions aq
     JOIN questions q ON q.id = aq.question_id
     WHERE q.id = ? AND aq.assessment_id = ?`,
    [questionID, assessmentID]
  )
  if (!question) return error('NOT_FOUND', 'Soal tidak ditemukan.', 404)
  if (textValue(question, 'type') !== 'essay') {
    return error('VALIDATION_ERROR', 'Review manual hanya tersedia untuk soal essay.')
  }

  const submission = await first<Record<string, unknown>>(
    'SELECT * FROM assessment_submissions WHERE id = ? AND assessment_id = ?',
    [submissionID, assessmentID]
  )
  if (!submission) return error('NOT_FOUND', 'Submission tidak ditemukan.', 404)

  const answers = parseSubmissionAnswers(textValue(submission, 'answers_json'))
  const target = answers.find((answer) => answer.question_id === questionID)
  if (!target) return error('NOT_FOUND', 'Jawaban siswa untuk soal ini tidak ditemukan.', 404)

  target.is_correct = payload.is_correct

  const questions = await questionsForAssessment(assessmentID)
  const { score, scoredQuestions } = scoreSubmissionAnswers(answers, questions)

  await execute(
    `UPDATE assessment_submissions
     SET answers_json = ?, score = ?, scored_questions = ?
     WHERE id = ? AND assessment_id = ?`,
    [JSON.stringify(answers), score, scoredQuestions, submissionID, assessmentID]
  )

  return data({ success: true, score, scored_questions: scoredQuestions })
}

async function recalculateAssessmentSubmissions(assessmentID: string, user: AuthUser) {
  await ensureAssessmentPublishTables()
  await ensureAssessmentOwner(assessmentID, user)

  const questions = await questionsForAssessment(assessmentID)
  const submissions = await all<Record<string, unknown>>(
    'SELECT * FROM assessment_submissions WHERE assessment_id = ?',
    [assessmentID]
  )

  for (const submission of submissions) {
    const submissionID = textValue(submission, 'id')
    const answers = parseSubmissionAnswers(textValue(submission, 'answers_json'))
    const { score, scoredQuestions } = scoreSubmissionAnswers(answers, questions)

    await execute(
      `UPDATE assessment_submissions
       SET score = ?, scored_questions = ?, total_questions = ?
       WHERE id = ? AND assessment_id = ?`,
      [score, scoredQuestions, questions.length, submissionID, assessmentID]
    )
  }

  return data({ success: true, recalculated_submissions: submissions.length })
}

function parseSubmissionAnswers(value: string) {
  const parsed = JSON.parse(value || '[]') as unknown
  if (!Array.isArray(parsed)) return []

  return parsed
    .map((answer) => {
      const row = answer as Record<string, unknown>
      return {
        question_id: textValue(row, 'question_id'),
        answer: textValue(row, 'answer'),
        is_correct: typeof row.is_correct === 'boolean' ? row.is_correct : null,
      }
    })
    .filter((answer) => answer.question_id)
}

function answerCorrectness(
  answer: { answer: string; is_correct: boolean | null },
  question?: Record<string, unknown>
) {
  if (!question) return null
  if (textValue(question, 'type') === 'multiple_choice') {
    return answer.answer.toUpperCase() === textValue(question, 'correct_answer').toUpperCase()
  }
  return answer.is_correct
}

function scoreSubmissionAnswers(
  answers: { question_id: string; answer: string; is_correct: boolean | null }[],
  questions: unknown[]
) {
  const questionMap = new Map(
    questions.map((question) => {
      const row = question as Record<string, unknown>
      return [textValue(row, 'id'), row]
    })
  )
  let score = 0
  let scoredQuestions = 0

  for (const answer of answers) {
    const question = questionMap.get(answer.question_id)
    if (!question) continue

    const correctness = answerCorrectness(answer, question)
    if (correctness === null) continue

    scoredQuestions += 1
    if (correctness) score += 1
  }

  return { score, scoredQuestions }
}

async function questionsForAssessment(assessmentID: string) {
  const questions = await all<Record<string, unknown>>(
    `SELECT q.*, aq.number, aq.points, aq.id AS assessment_question_id
     FROM assessment_questions aq
     JOIN questions q ON q.id = aq.question_id
     WHERE aq.assessment_id = ?
     ORDER BY aq.number ASC`,
    [assessmentID]
  )
  const options = await all<Record<string, unknown>>(
    `SELECT * FROM answer_options
     WHERE question_id IN (
       SELECT question_id FROM assessment_questions WHERE assessment_id = ?
     )
     ORDER BY question_id, label`,
    [assessmentID]
  )

  return questions.map((question) => ({
    ...question,
    answer_options: options
      .filter((option) => textValue(option, 'question_id') === textValue(question, 'id'))
      .map((option) => ({ ...option, is_correct: boolValue(option, 'is_correct') })),
  }))
}

async function ensureAssessmentOwner(assessmentID: string, user: AuthUser) {
  const assessment = await first<Record<string, unknown>>(
    'SELECT * FROM assessments WHERE id = ? AND owner_user_id = ?',
    [assessmentID, user.id]
  )
  if (!assessment) throw new Error('Assessment tidak ditemukan.')
  return assessment
}

async function ensureDraftAssessmentOwner(assessmentID: string, user: AuthUser) {
  const assessment = await ensureAssessmentOwner(assessmentID, user)
  if (assessmentIsPublished(assessment)) {
    throw new AuthError('Assessment sudah Published. Daftar soal tidak dapat diubah agar skor submission tetap konsisten.', 409)
  }
  return assessment
}

async function createQuestion(request: Request, assessmentID: string, user: AuthUser) {
  await ensureDraftAssessmentOwner(assessmentID, user)
  const payload = await body<QuestionInput>(request)
  const question = await insertQuestion(assessmentID, payload, user)
  await execute('UPDATE assessments SET status = ?, updated_at = ? WHERE id = ?', ['draft', now(), assessmentID])
  return data(question, { status: 201 })
}

async function insertQuestion(assessmentID: string, input: QuestionInput, user: AuthUser) {
  const stamp = now()
  const questionID = id('qst')
  const number = input.number || (await nextQuestionNumber(assessmentID))
  const assessment = await first<Record<string, unknown>>(
    'SELECT subject, grade FROM assessments WHERE id = ? AND owner_user_id = ?',
    [assessmentID, user.id]
  )
  if (!assessment) throw new Error('Assessment tidak ditemukan.')

  const questionType = input.type === 'essay' ? 'essay' : 'multiple_choice'
  const difficulty = normalizeDifficulty(input.difficulty)
  const correctAnswer =
    questionType === 'multiple_choice'
      ? correctLabel(input.answer_options) || input.correct_answer || ''
      : input.correct_answer || ''

  await execute(
    `INSERT INTO questions (
      id, owner_user_id, category_id, subject, grade, type, difficulty, prompt, image_url,
      correct_answer, explanation, blueprint_item, tags_json, source, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      questionID,
      user.id,
      null,
      textValue(assessment, 'subject'),
      textValue(assessment, 'grade'),
      questionType,
      difficulty,
      input.prompt?.trim() ?? '',
      input.image_url?.trim() || null,
      correctAnswer,
      input.explanation?.trim() || null,
      input.blueprint_item?.trim() || null,
      null,
      'manual',
      stamp,
      stamp,
    ]
  )
  await execute(
    `INSERT INTO assessment_questions (
      id, assessment_id, question_id, number, points, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id('asq'), assessmentID, questionID, number, 1, stamp, stamp]
  )

  if (questionType === 'multiple_choice') {
    await replaceOptions(questionID, input.answer_options ?? [])
  }

  const rows = await questionsForAssessment(assessmentID)
  return rows.find((question) => textValue(question as Record<string, unknown>, 'id') === questionID)
}

async function updateQuestion(request: Request, assessmentID: string, questionID: string, user: AuthUser) {
  await ensureDraftAssessmentOwner(assessmentID, user)
  const payload = await body<QuestionInput>(request)
  const questionType = payload.type === 'essay' ? 'essay' : 'multiple_choice'
  const correctAnswer =
    questionType === 'multiple_choice'
      ? correctLabel(payload.answer_options) || payload.correct_answer || ''
      : payload.correct_answer || ''

  const stamp = now()
  await execute(
    `UPDATE assessment_questions
     SET number = ?, updated_at = ?
     WHERE assessment_id = ? AND question_id = ?`,
    [payload.number || 1, stamp, assessmentID, questionID]
  )

  await execute(
    `UPDATE questions
     SET type = ?, difficulty = ?, prompt = ?, image_url = ?, correct_answer = ?,
         explanation = ?, blueprint_item = ?, updated_at = ?
     WHERE id = ? AND owner_user_id = ?
       AND EXISTS (
         SELECT 1 FROM assessment_questions
         WHERE assessment_id = ? AND question_id = questions.id
       )`,
    [
      questionType,
      normalizeDifficulty(payload.difficulty),
      payload.prompt?.trim() ?? '',
      payload.image_url?.trim() || null,
      correctAnswer,
      payload.explanation?.trim() || null,
      payload.blueprint_item?.trim() || null,
      stamp,
      questionID,
      user.id,
      assessmentID,
    ]
  )

  await execute('DELETE FROM answer_options WHERE question_id = ?', [questionID])
  if (questionType === 'multiple_choice') await replaceOptions(questionID, payload.answer_options ?? [])

  const questions = await questionsForAssessment(assessmentID)
  return data(questions.find((question) => textValue(question as Record<string, unknown>, 'id') === questionID) ?? null)
}

async function deleteQuestion(assessmentID: string, questionID: string, user: AuthUser) {
  await ensureDraftAssessmentOwner(assessmentID, user)
  await execute('DELETE FROM assessment_questions WHERE question_id = ? AND assessment_id = ?', [questionID, assessmentID])
  await renumberQuestions(assessmentID)
  await execute('UPDATE assessments SET updated_at = ? WHERE id = ?', [now(), assessmentID])
  return data({ success: true })
}

async function attachQuestionsFromBank(request: Request, assessmentID: string, user: AuthUser) {
  await ensureDraftAssessmentOwner(assessmentID, user)
  const payload = await body<{ question_ids?: string[] }>(request)
  const questionIDs = Array.from(new Set((payload.question_ids ?? []).filter(Boolean)))
  if (questionIDs.length === 0) return error('VALIDATION_ERROR', 'Pilih minimal satu soal.')

  const existing = await all<Record<string, unknown>>(
    'SELECT question_id AS id FROM assessment_questions WHERE assessment_id = ?',
    [assessmentID]
  )
  const existingSet = new Set(existing.map((question) => textValue(question, 'id')))
  const ownerWhere = user.role === 'admin' ? '' : 'AND owner_user_id = ?'
  const availableArgs = user.role === 'admin' ? questionIDs : [...questionIDs, user.id]
  const available = await all<Record<string, unknown>>(
    `SELECT id FROM questions WHERE id IN (${questionIDs.map(() => '?').join(', ')}) ${ownerWhere}`,
    availableArgs
  )
  const availableSet = new Set(available.map((question) => textValue(question, 'id')))
  const attachIDs = questionIDs.filter((questionID) => availableSet.has(questionID) && !existingSet.has(questionID))
  const stamp = now()
  let nextNumber = await nextQuestionNumber(assessmentID)

  for (const questionID of attachIDs) {
    await execute(
      `INSERT INTO assessment_questions (
        id, assessment_id, question_id, number, points, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id('asq'), assessmentID, questionID, nextNumber, 1, stamp, stamp]
    )
    nextNumber += 1
  }

  if (attachIDs.length > 0) {
    await execute('UPDATE assessments SET status = ?, updated_at = ? WHERE id = ?', ['draft', stamp, assessmentID])
  }

  return data({
    attached_count: attachIDs.length,
    skipped_count: questionIDs.length - attachIDs.length,
  })
}

async function reorderQuestions(request: Request, assessmentID: string, user: AuthUser) {
  await ensureDraftAssessmentOwner(assessmentID, user)
  const payload = await body<{ question_ids?: string[] }>(request)
  const questionIDs = Array.isArray(payload.question_ids)
    ? payload.question_ids.filter((questionID) => typeof questionID === 'string' && questionID.trim())
    : []

  const existing = await all<Record<string, unknown>>(
    'SELECT question_id AS id FROM assessment_questions WHERE assessment_id = ?',
    [assessmentID]
  )
  const existingIDs = existing.map((question) => textValue(question, 'id'))
  const existingSet = new Set(existingIDs)
  const requestedSet = new Set(questionIDs)

  if (
    questionIDs.length !== existingIDs.length ||
    requestedSet.size !== existingIDs.length ||
    questionIDs.some((questionID) => !existingSet.has(questionID))
  ) {
    return error('VALIDATION_ERROR', 'Urutan soal tidak valid.')
  }

  const stamp = now()
  const temporaryOffset = existingIDs.length + questionIDs.length + 1000
  for (const [index, questionID] of questionIDs.entries()) {
    await execute('UPDATE assessment_questions SET number = ?, updated_at = ? WHERE question_id = ? AND assessment_id = ?', [
      temporaryOffset + index + 1,
      stamp,
      questionID,
      assessmentID,
    ])
  }
  for (const [index, questionID] of questionIDs.entries()) {
    await execute('UPDATE assessment_questions SET number = ?, updated_at = ? WHERE question_id = ? AND assessment_id = ?', [
      index + 1,
      stamp,
      questionID,
      assessmentID,
    ])
  }
  await execute('UPDATE assessments SET updated_at = ? WHERE id = ?', [stamp, assessmentID])

  return data({ questions: await questionsForAssessment(assessmentID) })
}

async function nextQuestionNumber(assessmentID: string) {
  const row = await first<Record<string, unknown>>(
    'SELECT COALESCE(MAX(number), 0) + 1 AS next_number FROM assessment_questions WHERE assessment_id = ?',
    [assessmentID]
  )
  return intValue(row ?? {}, 'next_number') || 1
}

async function replaceOptions(questionID: string, options: AnswerOptionInput[]) {
  const stamp = now()
  const normalized = options.length > 0 ? options : defaultOptions()
  for (const [index, option] of normalized.entries()) {
    await execute(
      `INSERT INTO answer_options (id, question_id, label, text, is_correct, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        option.id || id('opt'),
        questionID,
        option.label?.trim().toUpperCase() || String.fromCharCode(65 + index),
        option.text?.trim() || '',
        option.is_correct ? 1 : 0,
        stamp,
        stamp,
      ]
    )
  }
}

async function renumberQuestions(assessmentID: string) {
  const questions = await all<Record<string, unknown>>(
    `SELECT question_id AS id
     FROM assessment_questions
     WHERE assessment_id = ?
     ORDER BY number ASC, created_at ASC`,
    [assessmentID]
  )
  for (const [index, question] of questions.entries()) {
    await execute('UPDATE assessment_questions SET number = ?, updated_at = ? WHERE assessment_id = ? AND question_id = ?', [
      index + 1,
      now(),
      assessmentID,
      textValue(question, 'id'),
    ])
  }
}

function normalizeDifficulty(value?: string) {
  if (value === 'easy' || value === 'medium' || value === 'hard') return value
  return 'medium'
}

function correctLabel(options?: AnswerOptionInput[]) {
  return options?.find((option) => option.is_correct)?.label?.trim().toUpperCase()
}

function defaultOptions(): AnswerOptionInput[] {
  return [
    { label: 'A', text: '', is_correct: true },
    { label: 'B', text: '', is_correct: false },
    { label: 'C', text: '', is_correct: false },
    { label: 'D', text: '', is_correct: false },
  ]
}

async function listJobs(user: AuthUser, admin = false) {
  const rows = await all<Record<string, unknown>>(
    admin
      ? `SELECT jobs.*, users.name AS owner_name FROM jobs LEFT JOIN users ON users.id = jobs.owner_user_id ORDER BY jobs.created_at DESC LIMIT 100`
      : `SELECT * FROM jobs WHERE owner_user_id = ? ORDER BY created_at DESC LIMIT 100`,
    admin ? [] : [user.id]
  )
  return data(rows)
}

async function jobNotifications(request: Request, user: AuthUser) {
  const initialJobs = await all<Record<string, unknown>>(
    'SELECT * FROM jobs WHERE owner_user_id = ? ORDER BY created_at DESC LIMIT 12',
    [user.id]
  )

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      addJobNotificationClient(user.id, controller)
      sendSSE(controller, 'jobs.snapshot', { jobs: initialJobs })

      const keepAlive = setInterval(() => {
        sendSSE(controller, 'ping', { at: now() })
      }, 30000)

      request.signal.addEventListener('abort', () => {
        clearInterval(keepAlive)
        removeJobNotificationClient(user.id, controller)
        controller.close()
      })
    },
    cancel() {
      // Cleanup is handled by the abort listener for normal browser disconnects.
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}

function addJobNotificationClient(userID: string, controller: ReadableStreamDefaultController<Uint8Array>) {
  const clients = jobNotificationClients.get(userID) ?? new Set<ReadableStreamDefaultController<Uint8Array>>()
  clients.add(controller)
  jobNotificationClients.set(userID, clients)
}

function removeJobNotificationClient(userID: string, controller: ReadableStreamDefaultController<Uint8Array>) {
  const clients = jobNotificationClients.get(userID)
  if (!clients) return
  clients.delete(controller)
  if (clients.size === 0) jobNotificationClients.delete(userID)
}

function sendSSE(
  controller: ReadableStreamDefaultController<Uint8Array>,
  event: string,
  payload: unknown
) {
  controller.enqueue(sseEncoder.encode(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`))
}

function emitJobNotification(userID: string, event: string, payload: unknown) {
  const clients = jobNotificationClients.get(userID)
  if (!clients) return

  for (const controller of clients) {
    try {
      sendSSE(controller, event, payload)
    } catch {
      removeJobNotificationClient(userID, controller)
    }
  }
}

async function emitJobUpdated(userID: string, jobID: string) {
  const job = await jobByID(jobID)
  if (job) emitJobNotification(userID, 'job.updated', { job })
}

async function createJob(request: Request, user: AuthUser) {
  const payload = await body<{ type?: string; input?: Record<string, unknown> }>(request)
  if (payload.type !== 'generate_questions') {
    return error('UNSUPPORTED_JOB', 'Tipe job belum didukung oleh fullstack API.')
  }

  const input = payload.input ?? {}
  const assessmentID = typeof input.assessment_id === 'string' ? input.assessment_id : ''
  const count = Number(input.question_count ?? 0)
  const materialText = typeof input.material_text === 'string' ? input.material_text.trim() : ''

  if (!assessmentID || !count || count < 1 || !materialText) {
    return error('VALIDATION_ERROR', 'Assessment, jumlah soal, dan materi wajib diisi.')
  }

  await ensureDraftAssessmentOwner(assessmentID, user)
  const cost = await getJobCost('generate_questions')
  const estimate = cost.calculationType === 'per_question' ? cost.unitCredit * count : cost.unitCredit
  await ensureCreditAvailableForJob(user, estimate)
  const jobID = id('job')
  const stamp = now()

  await execute(
    `INSERT INTO jobs (
      id, owner_user_id, type, status, input_snapshot_json, estimated_credit,
      actual_credit, credit_status, error_message, created_at, updated_at, completed_at
    ) VALUES (?, ?, 'generate_questions', 'processing', ?, ?, 0, 'reserved', NULL, ?, ?, NULL)`,
    [jobID, user.id, JSON.stringify(input), estimate, stamp, stamp]
  )
  await emitJobUpdated(user.id, jobID)

  void processAssessmentGenerateJob({
    jobID,
    assessmentID,
    user,
    input,
    count,
    materialText,
    costCalculationType: cost.calculationType === 'per_question' ? 'per_question' : 'fixed',
    costUnitCredit: cost.unitCredit,
  })

  return data(await jobByID(jobID), { status: 202 })
}

async function processAssessmentGenerateJob({
  jobID,
  assessmentID,
  user,
  input,
  count,
  materialText,
  costCalculationType,
  costUnitCredit,
}: {
  jobID: string
  assessmentID: string
  user: AuthUser
  input: Record<string, unknown>
  count: number
  materialText: string
  costCalculationType: 'fixed' | 'per_question'
  costUnitCredit: number
}) {
  try {
    const generated = await generateQuestionsWithAI(input)
    const questions = generated.slice(0, count)
    for (const generatedQuestion of questions) {
      await insertQuestion(assessmentID, mapGeneratedQuestion(generatedQuestion, input), user)
    }

    const actualCredit = costCalculationType === 'per_question' ? costUnitCredit * questions.length : costUnitCredit
    await chargeCredit(user, -actualCredit, 'ai_charge', 'Generate soal dengan AI.', user, jobID, assessmentID)
    await execute(
      `UPDATE jobs SET status = 'completed', actual_credit = ?, credit_status = 'charged',
       updated_at = ?, completed_at = ? WHERE id = ?`,
      [actualCredit, now(), now(), jobID]
    )
    await execute(
      `UPDATE assessments
       SET creation_mode = 'ai', material_text = ?, material_extracted_at = ?, status = 'draft', updated_at = ?
       WHERE id = ?`,
      [materialText, now(), now(), assessmentID]
    )
    await audit('job.completed', user, { type: 'generate_questions', actual_credit: actualCredit }, undefined, assessmentID, jobID)
    await emitJobUpdated(user.id, jobID)
  } catch (err) {
    await execute(
      `UPDATE jobs SET status = 'failed', credit_status = 'refunded', error_message = ?, updated_at = ?, completed_at = ? WHERE id = ?`,
      [err instanceof Error ? err.message : 'Job gagal diproses.', now(), now(), jobID]
    )
    await emitJobUpdated(user.id, jobID)
  }
}

async function jobByID(jobID: string) {
  return first<Record<string, unknown>>('SELECT * FROM jobs WHERE id = ?', [jobID])
}

function mapGeneratedQuestion(question: GeneratedQuestion, input: Record<string, unknown>): QuestionInput {
  const type = question.type === 'essay' || input.question_type === 'essay' ? 'essay' : 'multiple_choice'
  const options = type === 'multiple_choice' ? normalizeGeneratedOptions(question) : []
  return {
    type,
    difficulty: normalizeDifficulty(question.difficulty),
    prompt: question.prompt ?? '',
    image_url: question.image_url ?? '',
    correct_answer: type === 'multiple_choice' ? correctLabel(options) : question.correct_answer ?? '',
    explanation: '',
    blueprint_item: question.blueprint_item ?? '',
    answer_options: options,
  }
}

function normalizeGeneratedOptions(question: GeneratedQuestion) {
  const options = question.answer_options ?? []
  if (options.length > 0) {
    return options.map((option, index) => ({
      label: option.label || String.fromCharCode(65 + index),
      text: option.text || '',
      is_correct: Boolean(option.is_correct) || option.label === question.correct_answer,
    }))
  }

  return defaultOptions()
}

async function generateQuestionsWithAI(input: Record<string, unknown>) {
  const count = Number(input.question_count ?? 5)
  const difficulty = String(input.difficulty ?? 'mixed')
  const allowedDifficulties =
    difficulty === 'mixed'
      ? 'Gunakan variasi easy, medium, dan hard. Jangan pernah isi difficulty dengan mixed.'
      : `Semua soal harus difficulty ${normalizeDifficulty(difficulty)}.`

  const prompt = `Buat ${count} soal assessment berdasarkan materi pembelajaran berikut.
Mata pelajaran: ${String(input.subject ?? '')}
Kelas: ${String(input.grade ?? '')}
Tipe soal: ${String(input.question_type ?? 'multiple_choice')}
Kesulitan: ${allowedDifficulties}
Arahan tambahan: ${String(input.blueprint ?? '-')}

Materi:
${String(input.material_text ?? '')}

Balas hanya JSON array valid. Setiap item berisi:
type, difficulty (easy|medium|hard), prompt, blueprint_item, correct_answer, answer_options.
Untuk multiple_choice, answer_options array berisi label, text, is_correct. Jangan sertakan pembahasan/explanation.`

  const questionProvider = (process.env.AI_PROVIDER_GENERATE_QUESTION || 'DEEPSEEK').toUpperCase()
  const maxTokens = Number(
    questionProvider === 'OPENAI'
      ? process.env.OPENAI_QUESTION_MAX_TOKENS ?? 0
      : process.env.DEEPSEEK_QUESTION_MAX_TOKENS ?? 0
  )
  const outputTokens = Math.max(maxTokens || 0, count * 700, 4000)
  return generateQuestionsWithProvider({ prompt, count, maxTokens: outputTokens })
}

async function generateExplanation(request: Request, assessmentID: string, questionID: string, user: AuthUser) {
  await ensureDraftAssessmentOwner(assessmentID, user)
  const payload = await body<{ question_text?: string }>(request)
  const questionText = payload.question_text?.trim()
  if (!questionText) return error('VALIDATION_ERROR', 'Teks soal wajib diisi.')

  const cost = await getJobCost('generate_explanation')
  await ensureCreditAvailableForJob(user, cost.unitCredit)
  const jobID = id('job')
  const stamp = now()

  await execute(
    `INSERT INTO jobs (
      id, owner_user_id, type, status, input_snapshot_json, estimated_credit,
      actual_credit, credit_status, error_message, created_at, updated_at, completed_at
    ) VALUES (?, ?, 'generate_explanation', 'processing', ?, ?, 0, 'reserved', NULL, ?, ?, NULL)`,
    [jobID, user.id, JSON.stringify({ assessment_id: assessmentID, question_id: questionID }), cost.unitCredit, stamp, stamp]
  )
  await emitJobUpdated(user.id, jobID)

  try {
    const apiKey = process.env.SUMOPOD_API_KEY
    if (!apiKey) throw new Error('SUMOPOD_API_KEY belum diisi.')

    const model = process.env.SUMOPOD_EXPLANATION_MODEL || process.env.SUMOPOD_MODEL || 'gpt-4o-mini'
    const apiURL = process.env.SUMOPOD_API_URL || 'https://ai.sumopod.com/v1/chat/completions'
    const explanationMaxTokens = Number(process.env.SUMOPOD_EXPLANATION_MAX_TOKENS ?? 1200)
    const prompt = buildExplanationPrompt(questionText)
    const explanation = await callSumopod(apiURL, apiKey, model, prompt, explanationMaxTokens, 0.2)

    await execute(
      `UPDATE questions
       SET explanation = ?, updated_at = ?
       WHERE id = ? AND owner_user_id = ?
         AND EXISTS (
           SELECT 1 FROM assessment_questions
           WHERE assessment_id = ? AND question_id = questions.id
         )`,
      [explanation, now(), questionID, user.id, assessmentID]
    )
    await chargeCredit(user, -cost.unitCredit, 'ai_charge', 'Generate pembahasan soal dengan AI.', user, jobID, assessmentID)
    await execute(
      `UPDATE jobs SET status = 'completed', actual_credit = ?, credit_status = 'charged',
       updated_at = ?, completed_at = ? WHERE id = ?`,
      [cost.unitCredit, now(), now(), jobID]
    )
    await emitJobUpdated(user.id, jobID)

    return data({ job: await jobByID(jobID), explanation })
  } catch (err) {
    await execute(
      `UPDATE jobs SET status = 'failed', credit_status = 'refunded', error_message = ?, updated_at = ?, completed_at = ? WHERE id = ?`,
      [err instanceof Error ? err.message : 'Generate pembahasan gagal diproses.', now(), now(), jobID]
    )
    await emitJobUpdated(user.id, jobID)
    throw err
  }
}

async function generateQuestionImage(request: Request, assessmentID: string, questionID: string, user: AuthUser) {
  const assessment = await ensureDraftAssessmentOwner(assessmentID, user)
  const question = await first<Record<string, unknown>>(
    `SELECT q.*, aq.number
     FROM assessment_questions aq
     JOIN questions q ON q.id = aq.question_id
     WHERE q.id = ? AND aq.assessment_id = ?`,
    [questionID, assessmentID]
  )

  if (!question) return error('NOT_FOUND', 'Soal tidak ditemukan.', 404)

  const payload = await body<{
    question_text?: string
    instructions?: string
    use_reference_image?: boolean
    image_mode?: string
  }>(request)
  const questionText = payload.question_text?.trim() || textValue(question, 'prompt')
  if (!questionText) return error('VALIDATION_ERROR', 'Teks soal wajib diisi.')
  const imageMode = normalizeImageMode(payload.image_mode)

  const cost = await getJobCost('generate_question_image')
  await ensureCreditAvailableForJob(user, cost.unitCredit)
  const jobID = id('job')
  const stamp = now()
  const inputSnapshot = {
    assessment_id: assessmentID,
    question_id: questionID,
    question_text: questionText,
    instructions: payload.instructions?.trim() ?? '',
    image_mode: imageMode,
    use_reference_image: imageMode === 'graphic' && Boolean(payload.use_reference_image),
  }

  await execute(
    `INSERT INTO jobs (
      id, owner_user_id, type, status, input_snapshot_json, estimated_credit,
      actual_credit, credit_status, error_message, created_at, updated_at, completed_at
    ) VALUES (?, ?, 'generate_question_image', 'processing', ?, ?, 0, 'reserved', NULL, ?, ?, NULL)`,
    [jobID, user.id, JSON.stringify(inputSnapshot), cost.unitCredit, stamp, stamp]
  )
  await emitJobUpdated(user.id, jobID)

  void processAssessmentQuestionImageJob({
    jobID,
    assessmentID,
    questionID,
    assessment,
    question,
    user,
    questionText,
    instructions: payload.instructions?.trim() ?? '',
    imageMode,
    useReferenceImage: imageMode === 'graphic' && Boolean(payload.use_reference_image),
    costUnitCredit: cost.unitCredit,
  })

  return data({ job: await jobByID(jobID), queued: true }, { status: 202 })
}

async function processAssessmentQuestionImageJob({
  jobID,
  assessmentID,
  questionID,
  assessment,
  question,
  user,
  questionText,
  instructions,
  imageMode,
  useReferenceImage,
  costUnitCredit,
}: {
  jobID: string
  assessmentID: string
  questionID: string
  assessment: Record<string, unknown>
  question: Record<string, unknown>
  user: AuthUser
  questionText: string
  instructions: string
  imageMode: 'graphic' | 'diagram'
  useReferenceImage: boolean
  costUnitCredit: number
}) {
  try {
    const existingImageURL = textValue(question, 'image_url')
    const referenceImageURL = useReferenceImage ? existingImageURL : ''
    const subject = textValue(assessment, 'subject')
    const grade = textValue(assessment, 'grade')
    const imageBytes =
      imageMode === 'diagram'
        ? await generateDiagramPngWithOpenAI({ questionText, subject, grade, instructions })
        : await generateImageIllustrationWithOpenAI({
            questionText,
            subject,
            grade,
            instructions,
            referenceImageURL,
          })
    const imageURL = await uploadQuestionImage(assessmentID, questionID, imageBytes)
    await deleteManagedBlob(existingImageURL).catch(() => undefined)

    await execute(
      `UPDATE questions
       SET image_url = ?, updated_at = ?
       WHERE id = ? AND owner_user_id = ?
         AND EXISTS (
           SELECT 1 FROM assessment_questions
           WHERE assessment_id = ? AND question_id = questions.id
         )`,
      [imageURL, now(), questionID, user.id, assessmentID]
    )
    await chargeCredit(user, -costUnitCredit, 'ai_charge', 'Generate gambar ilustrasi soal dengan AI.', user, jobID, assessmentID)
    await execute(
      `UPDATE jobs SET status = 'completed', actual_credit = ?, credit_status = 'charged',
       updated_at = ?, completed_at = ? WHERE id = ?`,
      [costUnitCredit, now(), now(), jobID]
    )
    await audit('job.completed', user, { type: 'generate_question_image', actual_credit: costUnitCredit }, undefined, assessmentID, jobID)
    await emitJobUpdated(user.id, jobID)
  } catch (err) {
    await execute(
      `UPDATE jobs SET status = 'failed', credit_status = 'refunded', error_message = ?, updated_at = ?, completed_at = ? WHERE id = ?`,
      [err instanceof Error ? err.message : 'Generate gambar gagal diproses.', now(), now(), jobID]
    )
    await emitJobUpdated(user.id, jobID)
  }
}

async function deleteQuestionImage(assessmentID: string, questionID: string, user: AuthUser) {
  await ensureDraftAssessmentOwner(assessmentID, user)
  const question = await first<Record<string, unknown>>(
    `SELECT q.image_url
     FROM assessment_questions aq
     JOIN questions q ON q.id = aq.question_id
     WHERE q.id = ? AND aq.assessment_id = ?`,
    [questionID, assessmentID]
  )

  if (!question) return error('NOT_FOUND', 'Soal tidak ditemukan.', 404)

  const imageURL = textValue(question, 'image_url')
  await deleteManagedBlob(imageURL)
  await execute(
    `UPDATE questions
     SET image_url = NULL, updated_at = ?
     WHERE id = ? AND owner_user_id = ?
       AND EXISTS (
         SELECT 1 FROM assessment_questions
         WHERE assessment_id = ? AND question_id = questions.id
       )`,
    [now(), questionID, user.id, assessmentID]
  )

  return data({ success: true })
}

async function deleteManagedBlob(imageURL: string) {
  if (!isVercelBlobURL(imageURL)) return
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error('BLOB_READ_WRITE_TOKEN belum diisi.')
  }

  await del(imageURL)
}

function isVercelBlobURL(imageURL: string) {
  if (!imageURL) return false

  try {
    const url = new URL(imageURL)
    return url.hostname.endsWith('blob.vercel-storage.com')
  } catch {
    return false
  }
}

function buildQuestionImagePromptRequest(input: {
  questionText: string
  subject: string
  grade: string
  instructions: string
  hasReferenceImage: boolean
}) {
  const task = input.hasReferenceImage
    ? 'revise the existing reference image'
    : 'create a new image'

  return `${input.questionText}

Buatkan prompt untuk menghasilkan gambar visualisasi untuk soal diatas dengan akurat.
Prompt tersebut akan langsung dikirim ke AI lain untuk menghasilkan SVG, jadi prompt harus memerintahkan AI tersebut untuk membalas hanya satu dokumen SVG lengkap.
Untuk prompt gunakan bahasa Inggris.

Aturan prompt yang harus dibuat:
- Prompt harus meminta output berupa SVG lengkap, bukan penjelasan, bukan Mermaid, bukan TikZ, bukan plaintext.
- Prompt harus menyebut width="1200", height="800", viewBox="0 0 1200 800", white background.
- Prompt harus melarang markdown, penjelasan, langkah penyelesaian, script, foreignObject, external image, animation, dan CSS import.
- Prompt harus meminta elemen SVG geometris seperti circle, line, path, text, marker, rect bila diperlukan.
- Prompt harus meminta agar jawaban akhir/kunci jawaban tidak ditampilkan.
- Balas hanya prompt bahasa Inggris, tanpa pembuka, tanpa markdown, tanpa penjelasan.`
}

async function generateImageIllustrationWithOpenAI(input: {
  questionText: string
  subject: string
  grade: string
  instructions: string
  referenceImageURL: string
}) {
  const imagePrompt = buildDirectQuestionImagePrompt({
    questionText: input.questionText,
    subject: input.subject,
    grade: input.grade,
    instructions: input.instructions,
    hasReferenceImage: Boolean(input.referenceImageURL),
  })
  return generateImageWithOpenAI(imagePrompt, input.referenceImageURL)
}

function buildDirectQuestionImagePrompt(input: {
  questionText: string
  subject: string
  grade: string
  instructions: string
  hasReferenceImage: boolean
}) {
  return `Create a clean educational illustration for a worksheet question.

Subject: ${input.subject || '-'}
Grade: ${input.grade || '-'}
Question:
${input.questionText}

${input.hasReferenceImage ? 'Use the provided reference image only as visual context for the revision.' : 'Create a new graphic illustration from the question.'}
${input.instructions ? `Additional instructions: ${input.instructions}` : ''}

Requirements:
- Make a clear graphic illustration, not an SVG/code diagram.
- Do not show or reveal the final answer.
- Do not include solution steps, answer keys, or unrelated text.
- Keep labels minimal and only include labels that help understand the question.
- Use a clean, printable, classroom-friendly style with high contrast and simple composition.`
}

async function generateDiagramPngWithOpenAI(input: {
  questionText: string
  subject: string
  grade: string
  instructions: string
}) {
  const promptDraft = buildQuestionImagePromptRequest({
    questionText: input.questionText,
    subject: input.subject,
    grade: input.grade,
    instructions: input.instructions,
    hasReferenceImage: false,
  })
  const imagePrompt = await buildImageGenerationPromptWithProvider({
    prompt: promptDraft,
    maxTokens: Number(process.env.DEEPSEEK_IMAGE_PROMPT_MAX_TOKENS ?? process.env.OPENAI_IMAGE_PROMPT_MAX_TOKENS ?? 900),
  })
  const svgPrompt = buildDiagramSVGPrompt(imagePrompt)
  const svgText = await generateDiagramSVGWithProvider({
    prompt: svgPrompt,
    maxTokens: Number(process.env.DEEPSEEK_DIAGRAM_MAX_TOKENS ?? process.env.OPENAI_DIAGRAM_MAX_TOKENS ?? 3500),
  })
  const cleanSVG = sanitizeSVG(svgText)
  const sharp = (await import('sharp')).default

  return sharp(Buffer.from(cleanSVG))
    .resize(1200, 800, { fit: 'contain', background: '#ffffff' })
    .png()
    .toBuffer()
}

function buildDiagramSVGPrompt(imagePrompt: string) {
  return imagePrompt
}

function sanitizeSVG(value: string) {
  const svgMatch = value.match(/<svg[\s\S]*<\/svg>/i)
  if (!svgMatch) throw new Error('AI tidak mengembalikan SVG yang valid.')

  const svg = svgMatch[0]
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, '')
    .replace(/\s(?:href|xlink:href)\s*=\s*(['"])(?!#).*?\1/gi, '')

  if (!/<svg[\s\S]*<\/svg>/i.test(svg)) {
    throw new Error('SVG diagram tidak valid.')
  }

  return svg
}

async function generateImageWithOpenAI(prompt: string, referenceImageURL = '') {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY belum diisi.')

  const model = process.env.OPENAI_IMAGE_MODEL || 'gpt-5-nano'
  const size = process.env.OPENAI_IMAGE_SIZE || '1024x1024'
  const quality = process.env.OPENAI_IMAGE_QUALITY || 'low'

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      input: buildOpenAIImageInput(prompt, referenceImageURL),
      tools: [
        {
          type: 'image_generation',
          action: referenceImageURL ? 'edit' : 'generate',
          size,
          quality,
        },
      ],
      tool_choice: { type: 'image_generation' },
    }),
  })

  const payload = (await response.json().catch(() => ({}))) as {
    output?: { type?: string; result?: string }[]
    error?: { message?: string }
  }

  if (!response.ok) {
    throw new Error(payload.error?.message || 'OpenAI gagal generate gambar.')
  }

  const base64 = extractOpenAIImageBase64(payload)
  if (base64) return Buffer.from(base64, 'base64')

  throw new Error(`OpenAI model ${model} tidak mengembalikan data gambar.`)
}

function buildOpenAIImageInput(prompt: string, referenceImageURL: string) {
  if (!referenceImageURL) return prompt

  return [
    {
      role: 'user',
      content: [
        { type: 'input_text', text: prompt },
        { type: 'input_image', image_url: referenceImageURL },
      ],
    },
  ]
}

function extractOpenAIImageBase64(payload: unknown) {
  const stack: unknown[] = [payload]

  while (stack.length > 0) {
    const current = stack.pop()

    if (typeof current === 'string' && looksLikeBase64Image(current)) {
      return current
    }

    if (Array.isArray(current)) {
      stack.push(...current)
      continue
    }

    if (!current || typeof current !== 'object') continue

    const record = current as Record<string, unknown>
    if (
      record.type === 'image_generation_call' &&
      record.status !== 'failed' &&
      typeof record.result === 'string' &&
      record.result.trim()
    ) {
      return record.result.trim()
    }
    if (typeof record.b64_json === 'string' && record.b64_json.trim()) {
      return record.b64_json.trim()
    }
    if (typeof record.image_base64 === 'string' && record.image_base64.trim()) {
      return record.image_base64.trim()
    }

    stack.push(...Object.values(record))
  }

  return ''
}

function looksLikeBase64Image(value: string) {
  const text = value.trim()
  return text.length > 500 && /^[A-Za-z0-9+/]+={0,2}$/.test(text)
}

async function uploadQuestionImage(assessmentID: string, questionID: string, imageBytes: Buffer) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error('BLOB_READ_WRITE_TOKEN belum diisi.')
  }

  const blob = await put(
    `question-images/${assessmentID}/${questionID}-${Date.now()}.png`,
    new Blob([new Uint8Array(imageBytes)], { type: 'image/png' }),
    {
      access: 'public',
      contentType: 'image/png',
      addRandomSuffix: true,
    }
  )

  return blob.url
}

function buildExplanationPrompt(questionText: string) {
  return `Jelaskan penyelesaian soal berikut dalam bahasa Indonesia yang jelas dan mudah dipahami siswa.

Soal:
${questionText}

Aturan output:
- Tulis langsung pembahasan, tanpa pembuka seperti "Tentu".
- Gunakan maksimal 10 langkah bernomor.
- Setiap langkah maksimal 5 kalimat.
- Hindari tabel dan markdown rumit.
- Jika ada rumus, tulis sederhana.
- Akhiri dengan jawaban akhir yang singkat.
- Panjang total maksimal 500 kata.`
}

async function callSumopod(apiURL: string, apiKey: string, model: string, prompt: string, maxTokens: number, temperature: number) {
  const response = await fetch(apiURL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
      temperature,
    }),
  })

  const payload = (await response.json().catch(() => ({}))) as {
    choices?: {
      finish_reason?: string
      text?: string
      message?: {
        content?: unknown
        reasoning_content?: string
      }
    }[]
    output_text?: string
    error?: { message?: string }
  }

  if (!response.ok) {
    throw new Error(payload.error?.message || 'AI provider gagal memproses request.')
  }

  const content = extractAIContent(payload)
  if (!content) {
    const finishReason = payload.choices?.[0]?.finish_reason
    throw new Error(
      finishReason === 'length'
        ? 'AI provider mengembalikan response melebihi batas token'
        : 'AI provider tidak mengembalikan konten.'
    )
  }
  return content
}

function extractAIContent(payload: {
  choices?: {
    text?: string
    message?: {
      content?: unknown
      reasoning_content?: string
    }
  }[]
  output_text?: string
}) {
  const firstChoice = payload.choices?.[0]
  const content = firstChoice?.message?.content

  if (typeof content === 'string' && content.trim()) return content.trim()

  if (Array.isArray(content)) {
    const text = content
      .map((part) => {
        if (typeof part === 'string') return part
        if (part && typeof part === 'object') {
          const maybeText = (part as { text?: unknown }).text
          if (typeof maybeText === 'string') return maybeText
        }
        return ''
      })
      .join('')
      .trim()
    if (text) return text
  }

  if (typeof firstChoice?.text === 'string' && firstChoice.text.trim()) {
    return firstChoice.text.trim()
  }

  if (typeof payload.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text.trim()
  }

  if (typeof firstChoice?.message?.reasoning_content === 'string') {
    return firstChoice.message.reasoning_content.trim()
  }

  return ''
}

async function meCredit(user: AuthUser) {
  const row = await first<Record<string, unknown>>('SELECT * FROM credit_balances WHERE user_id = ?', [user.id])
  const balance = intValue(row ?? {}, 'balance')
  const reserved_balance = await reservedCreditForUser(user.id)
  return data({
    balance,
    reserved_balance,
    available_balance: balance - reserved_balance,
    updated_at: textValue(row ?? {}, 'updated_at'),
  })
}

async function meTransactions(user: AuthUser) {
  const rows = await all<Record<string, unknown>>(
    'SELECT * FROM credit_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 100',
    [user.id]
  )
  return data(rows)
}

async function adminDashboard() {
  const row = await first<Record<string, unknown>>(
    `SELECT
      (SELECT COUNT(*) FROM users) AS total_users,
      (SELECT COUNT(*) FROM users WHERE role = 'guru' AND status = 'active') AS active_teachers,
      (SELECT COALESCE(SUM(balance), 0) FROM credit_balances) AS total_credit_balance,
      (SELECT COUNT(*) FROM jobs WHERE created_at::date = CURRENT_DATE) AS jobs_today,
      (SELECT COUNT(*) FROM jobs WHERE status = 'failed' AND created_at::date = CURRENT_DATE) AS failed_jobs_today,
      (SELECT COALESCE(SUM(ABS(amount)), 0) FROM credit_transactions WHERE type = 'ai_charge' AND created_at::date = CURRENT_DATE) AS credits_used_today`
  )
  return data(row)
}

async function adminUsers() {
  const rows = await all<Record<string, unknown>>(
    `SELECT users.id, users.name, users.email, users.role, users.status,
     COALESCE(credit_balances.balance, 0) AS credit_balance
     FROM users
     LEFT JOIN credit_balances ON credit_balances.user_id = users.id
     ORDER BY users.created_at DESC`
  )
  return data(rows)
}

async function createUser(request: Request, actor: AuthUser) {
  const payload = await body<{
    name?: string
    email?: string
    password?: string
    role?: string
    status?: string
    initial_credit?: number
  }>(request)
  const name = payload.name?.trim()
  const email = payload.email?.trim().toLowerCase()
  const password = payload.password ?? ''
  const initialCredit = Number(payload.initial_credit ?? 0)

  if (!name || !email || password.length < 8) {
    return error('VALIDATION_ERROR', 'Nama, email, dan password minimal 8 karakter wajib diisi.')
  }

  const userID = id('usr')
  const stamp = now()
  await execute(
    `INSERT INTO users (id, name, email, password_hash, role, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userID,
      name,
      email,
      await bcrypt.hash(password, 10),
      payload.role === 'admin' ? 'admin' : 'guru',
      payload.status === 'inactive' ? 'inactive' : 'active',
      stamp,
      stamp,
    ]
  )
  await execute('INSERT INTO credit_balances (user_id, balance, updated_at) VALUES (?, ?, ?)', [
    userID,
    Math.max(0, initialCredit),
    stamp,
  ])
  await audit('user.created', actor, { email }, userID)

  return data(await adminUserByID(userID), { status: 201 })
}

async function updateAdminUser(request: Request, userID: string, actor: AuthUser) {
  const payload = await body<{ name?: string; email?: string }>(request)
  await execute('UPDATE users SET name = ?, email = ?, updated_at = ? WHERE id = ?', [
    payload.name?.trim() ?? '',
    payload.email?.trim().toLowerCase() ?? '',
    now(),
    userID,
  ])
  await audit('user.updated', actor, { email: payload.email }, userID)
  return data(await adminUserByID(userID))
}

async function patchUserRole(request: Request, userID: string, actor: AuthUser) {
  const payload = await body<{ role?: string; reason?: string }>(request)
  const role = payload.role === 'admin' ? 'admin' : 'guru'
  await execute('UPDATE users SET role = ?, updated_at = ? WHERE id = ?', [role, now(), userID])
  await audit('user.role_changed', actor, { role, reason: payload.reason ?? '' }, userID)
  return data(await adminUserByID(userID))
}

async function patchUserStatus(request: Request, userID: string, actor: AuthUser) {
  const payload = await body<{ status?: string; reason?: string }>(request)
  const status = payload.status === 'inactive' ? 'inactive' : 'active'
  await execute('UPDATE users SET status = ?, updated_at = ? WHERE id = ?', [status, now(), userID])
  await audit('user.status_changed', actor, { status, reason: payload.reason ?? '' }, userID)
  return data(await adminUserByID(userID))
}

async function adminUserByID(userID: string) {
  return first<Record<string, unknown>>(
    `SELECT users.id, users.name, users.email, users.role, users.status,
     COALESCE(credit_balances.balance, 0) AS credit_balance
     FROM users
     LEFT JOIN credit_balances ON credit_balances.user_id = users.id
     WHERE users.id = ?`,
    [userID]
  )
}

async function adjustCredit(request: Request, userID: string, actor: AuthUser) {
  const payload = await body<{ amount?: number; type?: string; reason?: string }>(request)
  const amount = Number(payload.amount ?? 0)
  const user = await adminUserByID(userID)
  if (!user || !amount) return error('VALIDATION_ERROR', 'User dan jumlah kredit wajib valid.')

  const txID = await chargeCredit(
    publicUser(user),
    amount,
    amount < 0 ? 'admin_subtract' : 'admin_add',
    payload.reason?.trim() || 'Penyesuaian kredit oleh Admin.',
    actor
  )
  await audit('credit.adjusted', actor, { amount, reason: payload.reason ?? '' }, userID, undefined, undefined, txID ?? undefined)
  return data({ success: true })
}

async function adminCreditTransactions() {
  const rows = await all<Record<string, unknown>>(
    `SELECT credit_transactions.*, users.name AS user_name
     FROM credit_transactions
     LEFT JOIN users ON users.id = credit_transactions.user_id
     ORDER BY credit_transactions.created_at DESC
     LIMIT 200`
  )
  return data(rows)
}

async function adminAuditLogs() {
  const rows = await all<Record<string, unknown>>(
    `SELECT audit_logs.*, actor.name AS actor_name, target.name AS target_name
     FROM audit_logs
     LEFT JOIN users actor ON actor.id = audit_logs.actor_user_id
     LEFT JOIN users target ON target.id = audit_logs.target_user_id
     ORDER BY audit_logs.created_at DESC
     LIMIT 200`
  )
  return data(rows)
}

async function jobCosts() {
  const rows = await all<Record<string, unknown>>(
    'SELECT * FROM job_credit_costs ORDER BY job_type ASC'
  )
  const merged = new Map<string, Record<string, unknown>>()

  for (const cost of defaultJobCosts) {
    merged.set(cost.job_type, { ...cost, is_active: cost.is_active ? 1 : 0 })
  }
  for (const row of rows) {
    merged.set(textValue(row, 'job_type'), row)
  }

  return data(
    Array.from(merged.values())
      .sort((a, b) => textValue(a, 'job_type').localeCompare(textValue(b, 'job_type')))
      .map((row) => ({ ...row, is_active: boolValue(row, 'is_active') }))
  )
}

async function jobCostDetail(jobType: string) {
  const row =
    (await first<Record<string, unknown>>(
    'SELECT * FROM job_credit_costs WHERE job_type = ? AND is_active = 1',
    [jobType]
    )) ?? defaultJobCost(jobType)

  if (!row) return error('NOT_FOUND', 'Biaya job tidak ditemukan atau belum aktif.', 404)

  return data({ ...row, is_active: boolValue(row, 'is_active') })
}

async function updateJobCost(request: Request, jobType: string) {
  const payload = await body<{
    display_name?: string
    calculation_type?: string
    unit_credit?: number
    is_active?: boolean
  }>(request)
  const stamp = now()
  await execute(
    `INSERT INTO job_credit_costs (
      job_type, display_name, calculation_type, unit_credit, is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(job_type) DO UPDATE SET
      display_name = excluded.display_name,
      calculation_type = excluded.calculation_type,
      unit_credit = excluded.unit_credit,
      is_active = excluded.is_active,
      updated_at = excluded.updated_at`,
    [
      jobType,
      payload.display_name?.trim() || jobType,
      payload.calculation_type === 'per_question' ? 'per_question' : 'fixed',
      Math.max(0, Number(payload.unit_credit ?? 0)),
      payload.is_active ? 1 : 0,
      stamp,
      stamp,
    ]
  )
  const row = await first<Record<string, unknown>>('SELECT * FROM job_credit_costs WHERE job_type = ?', [jobType])
  return data(row ? { ...row, is_active: boolValue(row, 'is_active') } : null)
}

async function exportDocx(assessmentID: string, user: AuthUser, request: NextRequest) {
  const assessment = await first<Record<string, unknown>>(
    'SELECT * FROM assessments WHERE id = ? AND owner_user_id = ?',
    [assessmentID, user.id]
  )
  if (!assessment) return error('NOT_FOUND', 'Assessment tidak ditemukan.', 404)

  const questions = await questionsForAssessment(assessmentID)
  const params = request.nextUrl.searchParams
  const parts = {
    blueprint: params.get('blueprint') !== '0',
    questions: params.get('questions') !== '0',
    answerKey: params.get('answer_key') !== '0',
    explanation: params.get('explanation') !== '0',
  }
  const buffer = await buildDocx(assessment, questions, parts)
  const arrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  ) as ArrayBuffer

  return new NextResponse(arrayBuffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${safeFilename(textValue(assessment, 'title'))}.docx"`,
    },
  })
}

async function buildDocx(
  assessment: Record<string, unknown>,
  questions: (Record<string, unknown> & { answer_options?: (Record<string, unknown> & { is_correct?: boolean })[] })[],
  parts: { blueprint: boolean; questions: boolean; answerKey: boolean; explanation: boolean }
) {
  const imageAssets = parts.questions ? await collectDocxImages(questions) : []
  const paragraphs = [
    paragraph(textValue(assessment, 'title'), true),
    paragraph(`${textValue(assessment, 'subject')} - ${textValue(assessment, 'grade')}`),
  ]

  if (parts.blueprint) {
    paragraphs.push(paragraph('Kisi-kisi Soal', true))
    for (const question of questions) {
      paragraphs.push(paragraph(`${intValue(question, 'number')}. ${textValue(question, 'blueprint_item') || textValue(question, 'prompt')} (${textValue(question, 'type')}, ${textValue(question, 'difficulty')})`))
    }
  }

  if (parts.questions) {
    paragraphs.push(paragraph('Soal', true))
    for (const question of questions) {
      paragraphs.push(paragraph(`${intValue(question, 'number')}. ${textValue(question, 'prompt')}`))
      const image = imageAssets.find((asset) => asset.questionID === textValue(question, 'id'))
      if (image) paragraphs.push(imageParagraph(image.relationshipID))
      for (const option of question.answer_options ?? []) {
        paragraphs.push(paragraph(`${textValue(option, 'label')}. ${textValue(option, 'text')}`))
      }
    }
  }

  if (parts.answerKey || parts.explanation) {
    paragraphs.push(paragraph('Kunci Jawaban dan Pembahasan', true))
    for (const question of questions) {
      paragraphs.push(paragraph(`${intValue(question, 'number')}. Kunci: ${textValue(question, 'correct_answer') || '-'}`))
      if (parts.explanation && textValue(question, 'explanation')) {
        paragraphs.push(paragraph(`Pembahasan: ${textValue(question, 'explanation')}`))
      }
    }
  }

  const zip = new JSZip()
  const imageContentTypes = Array.from(
    new Map(imageAssets.map((image) => [image.extension, image.contentType])).entries()
  )
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
${imageContentTypes.map(([extension, contentType]) => `<Default Extension="${extension}" ContentType="${contentType}"/>`).join('\n')}
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`)
  zip.folder('_rels')?.file('.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`)
  zip.folder('word')?.folder('_rels')?.file('document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${imageAssets.map((image) => `<Relationship Id="${image.relationshipID}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${image.filename}"/>`).join('\n')}
</Relationships>`)
  const media = zip.folder('word')?.folder('media')
  for (const image of imageAssets) {
    media?.file(image.filename, image.bytes)
  }
  zip.folder('word')?.file('document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
<w:body>${paragraphs.join('')}<w:sectPr/></w:body>
</w:document>`)

  return zip.generateAsync({ type: 'uint8array' })
}

function paragraph(value: string, bold = false) {
  return `<w:p><w:r>${bold ? '<w:rPr><w:b/></w:rPr>' : ''}<w:t xml:space="preserve">${xml(value)}</w:t></w:r></w:p>`
}

type DocxImageAsset = {
  questionID: string
  relationshipID: string
  filename: string
  extension: string
  contentType: string
  bytes: Uint8Array
}

async function collectDocxImages(
  questions: (Record<string, unknown> & { answer_options?: (Record<string, unknown> & { is_correct?: boolean })[] })[]
) {
  const images: DocxImageAsset[] = []

  for (const question of questions) {
    const imageURL = textValue(question, 'image_url')
    if (!imageURL) continue

    const image = await fetchDocxImage(imageURL).catch(() => null)
    if (!image) continue

    const index = images.length + 1
    images.push({
      questionID: textValue(question, 'id'),
      relationshipID: `rIdImage${index}`,
      filename: `question-${index}.${image.extension}`,
      extension: image.extension,
      contentType: image.contentType,
      bytes: image.bytes,
    })
  }

  return images
}

async function fetchDocxImage(imageURL: string) {
  const response = await fetch(imageURL)
  if (!response.ok) return null

  const contentType = response.headers.get('content-type')?.split(';')[0] || ''
  const bytes = new Uint8Array(await response.arrayBuffer())
  const extension = imageExtension(contentType, imageURL, bytes)
  if (!extension) return null

  return {
    bytes,
    extension,
    contentType: imageContentType(extension),
  }
}

function imageExtension(contentType: string, imageURL: string, bytes: Uint8Array) {
  if (contentType === 'image/png') return 'png'
  if (contentType === 'image/jpeg' || contentType === 'image/jpg') return 'jpg'
  if (contentType === 'image/gif') return 'gif'

  const pathname = (() => {
    try {
      return new URL(imageURL).pathname.toLowerCase()
    } catch {
      return imageURL.toLowerCase()
    }
  })()
  if (pathname.endsWith('.png')) return 'png'
  if (pathname.endsWith('.jpg') || pathname.endsWith('.jpeg')) return 'jpg'
  if (pathname.endsWith('.gif')) return 'gif'

  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'png'
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'jpg'
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return 'gif'

  return ''
}

function imageContentType(extension: string) {
  if (extension === 'jpg') return 'image/jpeg'
  return `image/${extension}`
}

function imageParagraph(relationshipID: string) {
  const cx = 4572000
  const cy = 2743200

  return `<w:p><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="1" name="Ilustrasi Soal"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="0" name="Ilustrasi Soal"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${relationshipID}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`
}

function xml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function safeFilename(value: string) {
  return value.trim().replace(/[^a-z0-9-_]+/gi, '-').replace(/^-+|-+$/g, '') || 'assessment'
}

async function handle(request: NextRequest, context: RouteContext) {
  const params = await context.params
  const path = params.path ?? []
  const method = request.method
  const [root, second, third, fourth, fifth, sixth] = path

  if (root === 'health') {
    await execute('SELECT 1')
    return data({ status: 'ok', database: 'ok' })
  }
  if (root === 'auth' && second === 'login' && method === 'POST') return login(request)
  if (root === 'public' && second === 'assessments' && third && path.length === 3 && method === 'GET') {
    return publicAssessment(third)
  }
  if (root === 'public' && second === 'assessments' && third && fourth === 'submissions' && method === 'POST') {
    return submitPublicAssessment(request, third)
  }

  const user = await currentUser(request)

  if (root === 'auth' && second === 'me' && method === 'GET') return data(user)
  if (root === 'question-bank' && path.length === 1 && method === 'GET') return questionBank(request, user)
  if (root === 'question-bank' && second === 'generate' && path.length === 2 && method === 'POST') {
    return generateQuestionBankQuestions(request, user)
  }
  if (root === 'question-bank' && second && third === 'explanation' && path.length === 3 && method === 'POST') {
    return generateQuestionBankExplanation(request, second, user)
  }
  if (root === 'question-bank' && second && third === 'image' && path.length === 3 && method === 'POST') {
    return generateQuestionBankImage(request, second, user)
  }
  if (root === 'question-bank' && second && third === 'image' && path.length === 3 && method === 'DELETE') {
    return deleteQuestionBankImage(second, user)
  }
  if (root === 'question-bank' && second && third === 'category' && path.length === 3 && method === 'PATCH') {
    return updateQuestionBankQuestionCategory(request, second, user)
  }
  if (root === 'question-bank' && second && path.length === 2 && method === 'DELETE') {
    return deleteQuestionBankQuestion(second, user)
  }
  if (root === 'question-bank' && second && path.length === 2 && method === 'PUT') {
    return updateQuestionBankQuestion(request, second, user)
  }
  if (root === 'assessments' && path.length === 1 && method === 'GET') return listAssessments(user)
  if (root === 'assessments' && path.length === 1 && method === 'POST') return createAssessment(request, user)
  if (root === 'assessments' && second && path.length === 2 && method === 'GET') return assessmentDetail(second, user)
  if (root === 'assessments' && second && path.length === 2 && method === 'DELETE') return deleteAssessment(second, user)
  if (root === 'assessments' && second && third === 'submissions' && method === 'GET') return assessmentSubmissions(second, user)
  if (root === 'assessments' && second && third === 'submissions' && fourth === 'recalculate' && method === 'POST') {
    return recalculateAssessmentSubmissions(second, user)
  }
  if (root === 'assessments' && second && third === 'submissions' && fourth && fifth === 'answers' && sixth && method === 'PATCH') {
    return reviewSubmissionAnswer(request, second, fourth, sixth, user)
  }
  if (root === 'assessments' && second && third === 'publish' && method === 'POST') return publishAssessment(request, second, user)
  if (root === 'assessments' && second && third === 'docx' && method === 'GET') return exportDocx(second, user, request)
  if (root === 'assessments' && second && third === 'questions' && !fourth && method === 'POST') return createQuestion(request, second, user)
  if (root === 'assessments' && second && third === 'questions' && fourth === 'attach' && method === 'POST') {
    return attachQuestionsFromBank(request, second, user)
  }
  if (root === 'assessments' && second && third === 'questions' && fourth === 'reorder' && method === 'POST') {
    return reorderQuestions(request, second, user)
  }
  if (root === 'assessments' && second && third === 'questions' && fourth && method === 'PUT') return updateQuestion(request, second, fourth, user)
  if (root === 'assessments' && second && third === 'questions' && fourth && !fifth && method === 'DELETE') return deleteQuestion(second, fourth, user)
  if (root === 'assessments' && second && third === 'questions' && fourth && fifth === 'explanation' && method === 'POST') {
    return generateExplanation(request, second, fourth, user)
  }
  if (root === 'assessments' && second && third === 'questions' && fourth && fifth === 'image' && method === 'POST') {
    return generateQuestionImage(request, second, fourth, user)
  }
  if (root === 'assessments' && second && third === 'questions' && fourth && fifth === 'image' && method === 'DELETE') {
    return deleteQuestionImage(second, fourth, user)
  }

  if (root === 'jobs' && second === 'notifications' && path.length === 2 && method === 'GET') return jobNotifications(request, user)
  if (root === 'jobs' && path.length === 1 && method === 'GET') return listJobs(user)
  if (root === 'jobs' && path.length === 1 && method === 'POST') return createJob(request, user)
  if (root === 'job-costs' && second && path.length === 2 && method === 'GET') return jobCostDetail(second)
  if (root === 'question-categories' && path.length === 1 && method === 'GET') return questionCategories(user)
  if (root === 'question-categories' && path.length === 1 && method === 'POST') return createQuestionCategory(request, user)
  if (root === 'me' && second === 'credit-balance' && method === 'GET') return meCredit(user)
  if (root === 'me' && second === 'credit-transactions' && method === 'GET') return meTransactions(user)

  if (root === 'admin') {
    const admin = await currentUser(request, 'admin')
    if (second === 'dashboard' && method === 'GET') return adminDashboard()
    if (second === 'users' && path.length === 2 && method === 'GET') return adminUsers()
    if (second === 'users' && path.length === 2 && method === 'POST') return createUser(request, admin)
    if (second === 'users' && third && path.length === 3 && method === 'PUT') return updateAdminUser(request, third, admin)
    if (second === 'users' && third && fourth === 'role' && method === 'PATCH') return patchUserRole(request, third, admin)
    if (second === 'users' && third && fourth === 'status' && method === 'PATCH') return patchUserStatus(request, third, admin)
    if (second === 'users' && third && fourth === 'credits' && fifth === 'adjust' && method === 'POST') {
      return adjustCredit(request, third, admin)
    }
    if (second === 'credits' && third === 'transactions' && method === 'GET') return adminCreditTransactions()
    if (second === 'jobs' && method === 'GET') return listJobs(admin, true)
    if (second === 'job-costs' && path.length === 2 && method === 'GET') return jobCosts()
    if (second === 'job-costs' && third && method === 'PUT') return updateJobCost(request, third)
    if (second === 'audit-logs' && method === 'GET') return adminAuditLogs()
  }

  return error('NOT_FOUND', 'Endpoint tidak ditemukan.', 404)
}

export async function GET(request: NextRequest, context: RouteContext) {
  return guarded(request, context)
}

export async function POST(request: NextRequest, context: RouteContext) {
  return guarded(request, context)
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return guarded(request, context)
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return guarded(request, context)
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return guarded(request, context)
}

async function guarded(request: NextRequest, context: RouteContext) {
  try {
    return await handle(request, context)
  } catch (err) {
    if (err instanceof AuthError) return error('UNAUTHORIZED', err.message, err.status)
    console.error(err)
    return error('INTERNAL_SERVER_ERROR', err instanceof Error ? err.message : 'Terjadi kesalahan pada server.', 500)
  }
}

