import { createClient, type Client, type InArgs } from '@libsql/client'
import bcrypt from 'bcryptjs'
import { jwtVerify, SignJWT } from 'jose'
import JSZip from 'jszip'
import { NextRequest, NextResponse } from 'next/server'

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

let dbClient: Client | null = null

function db() {
  if (!dbClient) {
    const url = process.env.TURSO_DATABASE_URL
    const authToken = process.env.TURSO_AUTH_TOKEN

    if (!url || !authToken) {
      throw new Error('TURSO_DATABASE_URL dan TURSO_AUTH_TOKEN wajib diisi untuk fullstack API.')
    }

    dbClient = createClient({ url, authToken })
  }

  return dbClient
}

async function execute(sql: string, args: InArgs = []) {
  return db().execute({ sql, args })
}

async function first<T extends Record<string, unknown>>(sql: string, args: InArgs = []) {
  const result = await execute(sql, args)
  return (result.rows[0] as unknown as T | undefined) ?? null
}

async function all<T extends Record<string, unknown>>(sql: string, args: InArgs = []) {
  const result = await execute(sql, args)
  return result.rows as unknown as T[]
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
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''

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

  if (!cost && jobType === 'generate_questions') {
    cost = { job_type: jobType, calculation_type: 'per_question', unit_credit: 1, is_active: 1 }
  }
  if (!cost && jobType === 'generate_explanation') {
    cost = { job_type: jobType, calculation_type: 'fixed', unit_credit: 1, is_active: 1 }
  }

  if (!cost) throw new Error(`Biaya job ${jobType} belum aktif.`)

  return {
    calculationType: textValue(cost, 'calculation_type') || 'fixed',
    unitCredit: intValue(cost, 'unit_credit') || 1,
  }
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
  return data(rows)
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
  return data({ ...assessment, questions })
}

async function questionsForAssessment(assessmentID: string) {
  const questions = await all<Record<string, unknown>>(
    'SELECT * FROM questions WHERE assessment_id = ? ORDER BY number ASC',
    [assessmentID]
  )
  const options = await all<Record<string, unknown>>(
    `SELECT * FROM answer_options
     WHERE question_id IN (SELECT id FROM questions WHERE assessment_id = ?)
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

async function createQuestion(request: Request, assessmentID: string, user: AuthUser) {
  await ensureAssessmentOwner(assessmentID, user)
  const payload = await body<QuestionInput>(request)
  const question = await insertQuestion(assessmentID, payload)
  await execute('UPDATE assessments SET status = ?, updated_at = ? WHERE id = ?', ['needs_review', now(), assessmentID])
  return data(question, { status: 201 })
}

async function insertQuestion(assessmentID: string, input: QuestionInput) {
  const stamp = now()
  const questionID = id('qst')
  const number = input.number || (await nextQuestionNumber(assessmentID))
  const questionType = input.type === 'essay' ? 'essay' : 'multiple_choice'
  const difficulty = normalizeDifficulty(input.difficulty)
  const correctAnswer =
    questionType === 'multiple_choice'
      ? correctLabel(input.answer_options) || input.correct_answer || ''
      : input.correct_answer || ''

  await execute(
    `INSERT INTO questions (
      id, assessment_id, number, type, difficulty, prompt, image_url, correct_answer,
      explanation, blueprint_item, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      questionID,
      assessmentID,
      number,
      questionType,
      difficulty,
      input.prompt?.trim() ?? '',
      input.image_url?.trim() || null,
      correctAnswer,
      input.explanation?.trim() || null,
      input.blueprint_item?.trim() || null,
      stamp,
      stamp,
    ]
  )

  if (questionType === 'multiple_choice') {
    await replaceOptions(questionID, input.answer_options ?? [])
  }

  const rows = await questionsForAssessment(assessmentID)
  return rows.find((question) => textValue(question as Record<string, unknown>, 'id') === questionID)
}

async function updateQuestion(request: Request, assessmentID: string, questionID: string, user: AuthUser) {
  await ensureAssessmentOwner(assessmentID, user)
  const payload = await body<QuestionInput>(request)
  const questionType = payload.type === 'essay' ? 'essay' : 'multiple_choice'
  const correctAnswer =
    questionType === 'multiple_choice'
      ? correctLabel(payload.answer_options) || payload.correct_answer || ''
      : payload.correct_answer || ''

  await execute(
    `UPDATE questions
     SET number = ?, type = ?, difficulty = ?, prompt = ?, image_url = ?, correct_answer = ?,
         explanation = ?, blueprint_item = ?, updated_at = ?
     WHERE id = ? AND assessment_id = ?`,
    [
      payload.number || 1,
      questionType,
      normalizeDifficulty(payload.difficulty),
      payload.prompt?.trim() ?? '',
      payload.image_url?.trim() || null,
      correctAnswer,
      payload.explanation?.trim() || null,
      payload.blueprint_item?.trim() || null,
      now(),
      questionID,
      assessmentID,
    ]
  )

  await execute('DELETE FROM answer_options WHERE question_id = ?', [questionID])
  if (questionType === 'multiple_choice') await replaceOptions(questionID, payload.answer_options ?? [])

  const questions = await questionsForAssessment(assessmentID)
  return data(questions.find((question) => textValue(question as Record<string, unknown>, 'id') === questionID) ?? null)
}

async function deleteQuestion(assessmentID: string, questionID: string, user: AuthUser) {
  await ensureAssessmentOwner(assessmentID, user)
  await execute('DELETE FROM questions WHERE id = ? AND assessment_id = ?', [questionID, assessmentID])
  await renumberQuestions(assessmentID)
  await execute('UPDATE assessments SET updated_at = ? WHERE id = ?', [now(), assessmentID])
  return data({ success: true })
}

async function nextQuestionNumber(assessmentID: string) {
  const row = await first<Record<string, unknown>>(
    'SELECT COALESCE(MAX(number), 0) + 1 AS next_number FROM questions WHERE assessment_id = ?',
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
    'SELECT id FROM questions WHERE assessment_id = ? ORDER BY number ASC, created_at ASC',
    [assessmentID]
  )
  for (const [index, question] of questions.entries()) {
    await execute('UPDATE questions SET number = ?, updated_at = ? WHERE id = ?', [
      index + 1,
      now(),
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

  await ensureAssessmentOwner(assessmentID, user)
  const cost = await getJobCost('generate_questions')
  const estimate = cost.calculationType === 'per_question' ? cost.unitCredit * count : cost.unitCredit
  const jobID = id('job')
  const stamp = now()

  await execute(
    `INSERT INTO jobs (
      id, owner_user_id, type, status, input_snapshot_json, estimated_credit,
      actual_credit, credit_status, error_message, created_at, updated_at, completed_at
    ) VALUES (?, ?, 'generate_questions', 'processing', ?, ?, 0, 'not_charged', NULL, ?, ?, NULL)`,
    [jobID, user.id, JSON.stringify(input), estimate, stamp, stamp]
  )

  try {
    const generated = await generateQuestionsWithAI(input)
    const questions = generated.slice(0, count)
    for (const generatedQuestion of questions) {
      await insertQuestion(assessmentID, mapGeneratedQuestion(generatedQuestion, input))
    }

    const actualCredit = cost.calculationType === 'per_question' ? cost.unitCredit * questions.length : cost.unitCredit
    await chargeCredit(user, -actualCredit, 'ai_charge', 'Generate soal dengan AI.', user, jobID, assessmentID)
    await execute(
      `UPDATE jobs SET status = 'completed', actual_credit = ?, credit_status = 'charged',
       updated_at = ?, completed_at = ? WHERE id = ?`,
      [actualCredit, now(), now(), jobID]
    )
    await execute(
      `UPDATE assessments
       SET creation_mode = 'ai', material_text = ?, material_extracted_at = ?, status = 'needs_review', updated_at = ?
       WHERE id = ?`,
      [materialText, now(), now(), assessmentID]
    )
    await audit('job.completed', user, { type: 'generate_questions', actual_credit: actualCredit }, undefined, assessmentID, jobID)

    return data(await jobByID(jobID), { status: 201 })
  } catch (err) {
    await execute(
      `UPDATE jobs SET status = 'failed', error_message = ?, updated_at = ?, completed_at = ? WHERE id = ?`,
      [err instanceof Error ? err.message : 'Job gagal diproses.', now(), now(), jobID]
    )
    throw err
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
  const apiKey = process.env.SUMOPOD_API_KEY
  if (!apiKey) throw new Error('SUMOPOD_API_KEY belum diisi.')

  const model = process.env.SUMOPOD_QUESTION_MODEL || process.env.SUMOPOD_MODEL || 'gpt-4o-mini'
  const apiURL = process.env.SUMOPOD_API_URL || 'https://ai.sumopod.com/v1/chat/completions'
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

  const content = await callSumopod(apiURL, apiKey, model, prompt, 4000, 0.4)
  const parsed = parseJSON<GeneratedQuestion[]>(content)
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('AI tidak mengembalikan daftar soal yang valid.')
  }
  return parsed
}

async function generateExplanation(request: Request, assessmentID: string, questionID: string, user: AuthUser) {
  await ensureAssessmentOwner(assessmentID, user)
  const payload = await body<{ question_text?: string }>(request)
  const questionText = payload.question_text?.trim()
  if (!questionText) return error('VALIDATION_ERROR', 'Teks soal wajib diisi.')

  const cost = await getJobCost('generate_explanation')
  const jobID = id('job')
  const stamp = now()

  await execute(
    `INSERT INTO jobs (
      id, owner_user_id, type, status, input_snapshot_json, estimated_credit,
      actual_credit, credit_status, error_message, created_at, updated_at, completed_at
    ) VALUES (?, ?, 'generate_explanation', 'processing', ?, ?, 0, 'not_charged', NULL, ?, ?, NULL)`,
    [jobID, user.id, JSON.stringify({ assessment_id: assessmentID, question_id: questionID }), cost.unitCredit, stamp, stamp]
  )

  const apiKey = process.env.SUMOPOD_API_KEY
  if (!apiKey) throw new Error('SUMOPOD_API_KEY belum diisi.')

  const model = process.env.SUMOPOD_EXPLANATION_MODEL || process.env.SUMOPOD_MODEL || 'gpt-4o-mini'
  const apiURL = process.env.SUMOPOD_API_URL || 'https://ai.sumopod.com/v1/chat/completions'
  const prompt = `${questionText} jabarkan penyelesaian soal diatas dengan detail perlangkah.`
  const explanation = await callSumopod(apiURL, apiKey, model, prompt, 2000, 0.3)

  await execute('UPDATE questions SET explanation = ?, updated_at = ? WHERE id = ? AND assessment_id = ?', [
    explanation,
    now(),
    questionID,
    assessmentID,
  ])
  await chargeCredit(user, -cost.unitCredit, 'ai_charge', 'Generate pembahasan soal dengan AI.', user, jobID, assessmentID)
  await execute(
    `UPDATE jobs SET status = 'completed', actual_credit = ?, credit_status = 'charged',
     updated_at = ?, completed_at = ? WHERE id = ?`,
    [cost.unitCredit, now(), now(), jobID]
  )

  return data({ job: await jobByID(jobID), explanation })
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
    choices?: { message?: { content?: string } }[]
    error?: { message?: string }
  }

  if (!response.ok) {
    throw new Error(payload.error?.message || 'AI provider gagal memproses request.')
  }

  const content = payload.choices?.[0]?.message?.content?.trim()
  if (!content) throw new Error('AI provider tidak mengembalikan konten.')
  return content
}

function parseJSON<T>(content: string): T {
  const cleaned = content
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
  return JSON.parse(cleaned) as T
}

async function meCredit(user: AuthUser) {
  const row = await first<Record<string, unknown>>('SELECT * FROM credit_balances WHERE user_id = ?', [user.id])
  return data({ balance: intValue(row ?? {}, 'balance'), updated_at: textValue(row ?? {}, 'updated_at') })
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
      (SELECT COUNT(*) FROM jobs WHERE date(created_at) = date('now')) AS jobs_today,
      (SELECT COUNT(*) FROM jobs WHERE status = 'failed' AND date(created_at) = date('now')) AS failed_jobs_today,
      (SELECT COALESCE(SUM(ABS(amount)), 0) FROM credit_transactions WHERE type = 'ai_charge' AND date(created_at) = date('now')) AS credits_used_today`
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
  return data(rows.map((row) => ({ ...row, is_active: boolValue(row, 'is_active') })))
}

async function updateJobCost(request: Request, jobType: string) {
  const payload = await body<{
    display_name?: string
    calculation_type?: string
    unit_credit?: number
    is_active?: boolean
  }>(request)
  await execute(
    `UPDATE job_credit_costs
     SET display_name = ?, calculation_type = ?, unit_credit = ?, is_active = ?, updated_at = ?
     WHERE job_type = ?`,
    [
      payload.display_name?.trim() || jobType,
      payload.calculation_type === 'per_question' ? 'per_question' : 'fixed',
      Math.max(0, Number(payload.unit_credit ?? 0)),
      payload.is_active ? 1 : 0,
      now(),
      jobType,
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
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`)
  zip.folder('_rels')?.file('.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`)
  zip.folder('word')?.file('document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body>${paragraphs.join('')}<w:sectPr/></w:body>
</w:document>`)

  return zip.generateAsync({ type: 'uint8array' })
}

function paragraph(value: string, bold = false) {
  return `<w:p><w:r>${bold ? '<w:rPr><w:b/></w:rPr>' : ''}<w:t xml:space="preserve">${xml(value)}</w:t></w:r></w:p>`
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
  const [root, second, third, fourth, fifth] = path

  if (root === 'health') {
    await execute('SELECT 1')
    return data({ status: 'ok', database: 'ok' })
  }
  if (root === 'auth' && second === 'login' && method === 'POST') return login(request)

  const user = await currentUser(request)

  if (root === 'auth' && second === 'me' && method === 'GET') return data(user)
  if (root === 'assessments' && path.length === 1 && method === 'GET') return listAssessments(user)
  if (root === 'assessments' && path.length === 1 && method === 'POST') return createAssessment(request, user)
  if (root === 'assessments' && second && path.length === 2 && method === 'GET') return assessmentDetail(second, user)
  if (root === 'assessments' && second && third === 'docx' && method === 'GET') return exportDocx(second, user, request)
  if (root === 'assessments' && second && third === 'questions' && !fourth && method === 'POST') return createQuestion(request, second, user)
  if (root === 'assessments' && second && third === 'questions' && fourth && method === 'PUT') return updateQuestion(request, second, fourth, user)
  if (root === 'assessments' && second && third === 'questions' && fourth && !fifth && method === 'DELETE') return deleteQuestion(second, fourth, user)
  if (root === 'assessments' && second && third === 'questions' && fourth && fifth === 'explanation' && method === 'POST') {
    return generateExplanation(request, second, fourth, user)
  }

  if (root === 'jobs' && path.length === 1 && method === 'GET') return listJobs(user)
  if (root === 'jobs' && path.length === 1 && method === 'POST') return createJob(request, user)
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
