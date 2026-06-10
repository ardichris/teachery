import type { GeneratedQuestion, GenerateDiagramRequest, GenerateQuestionsRequest } from './types'

export async function generateQuestionsWithOpenAI(request: GenerateQuestionsRequest) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY belum diisi.')

  const primaryModel = process.env.OPENAI_QUESTION_MODEL || 'gpt-4.1-mini'
  const models = Array.from(new Set([primaryModel, 'gpt-4.1-mini']))
  const errors: string[] = []

  for (const model of models) {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildOpenAITextRequest({
        model,
        prompt: request.prompt,
        maxTokens: request.maxTokens,
        reasoningSummary: process.env.OPENAI_QUESTION_REASONING_SUMMARY,
        reasoningEffort: process.env.OPENAI_QUESTION_REASONING_EFFORT,
      })),
    })

    const payload = (await response.json().catch(() => ({}))) as OpenAITextPayload
    if (!response.ok) {
      errors.push(`${model}: ${payload.error?.message || `HTTP ${response.status}`}`)
      continue
    }

    try {
      const questions = parseGeneratedQuestions(extractOpenAIText(payload))
      if (questions.length > 0) return questions
    } catch {
      // Try fallback model.
    }

    errors.push(`${model}: tidak mengembalikan daftar soal valid`)
  }

  throw new Error(`OpenAI gagal generate soal. ${errors.join(' | ')}`)
}

export async function generateDiagramSVGWithOpenAI(request: GenerateDiagramRequest) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY belum diisi.')

  const model = process.env.OPENAI_DIAGRAM_MODEL || process.env.OPENAI_IMAGE_PROMPT_MODEL || 'gpt-4.1-mini'
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(buildOpenAITextRequest({
      model,
      prompt: request.prompt,
      maxTokens: request.maxTokens,
      reasoningSummary: process.env.OPENAI_DIAGRAM_REASONING_SUMMARY,
      reasoningEffort: process.env.OPENAI_DIAGRAM_REASONING_EFFORT,
    })),
  })

  const payload = (await response.json().catch(() => ({}))) as OpenAITextPayload
  if (!response.ok) {
    throw new Error(payload.error?.message || 'OpenAI gagal membuat diagram SVG.')
  }

  const svg = extractOpenAIText(payload).trim()
  if (!svg) throw new Error('OpenAI tidak mengembalikan SVG diagram.')

  return svg
}

export async function buildImageGenerationPromptWithOpenAI(promptRequest: string) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY belum diisi.')

  const primaryModel = process.env.OPENAI_IMAGE_PROMPT_MODEL || 'gpt-4.1-mini'
  const models = Array.from(new Set([primaryModel, 'gpt-4.1-mini']))
  const errors: string[] = []

  for (const model of models) {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildOpenAITextRequest({
        model,
        prompt: promptRequest,
        maxTokens: Number(process.env.OPENAI_IMAGE_PROMPT_MAX_TOKENS ?? 900),
        reasoningSummary: process.env.OPENAI_IMAGE_PROMPT_REASONING_SUMMARY,
        reasoningEffort: process.env.OPENAI_IMAGE_PROMPT_REASONING_EFFORT,
      })),
    })

    const payload = (await response.json().catch(() => ({}))) as OpenAITextPayload
    if (!response.ok) {
      errors.push(`${model}: ${payload.error?.message || `HTTP ${response.status}`}`)
      continue
    }

    const prompt = extractOpenAIText(payload).trim()
    if (prompt) return prompt

    errors.push(
      `${model}: tidak mengembalikan prompt gambar` +
        (payload.status ? ` (status: ${payload.status})` : '') +
        (payload.incomplete_details?.reason ? ` (reason: ${payload.incomplete_details.reason})` : '')
    )
  }

  throw new Error(`OpenAI gagal membuat prompt gambar. ${errors.join(' | ')}`)
}

function buildOpenAITextRequest(input: {
  model: string
  prompt: string
  maxTokens: number
  reasoningSummary?: string
  reasoningEffort?: string
}) {
  const reasoning = openAIReasoningOptionsForModel(input.model, input.reasoningSummary, input.reasoningEffort)

  return {
    model: input.model,
    input: input.prompt,
    max_output_tokens: input.maxTokens,
    ...(reasoning ? { reasoning } : {}),
  }
}

function openAIReasoningOptionsForModel(model: string, summaryValue?: string, effortValue?: string) {
  if (!supportsOpenAIReasoningOptions(model)) return null

  const summary = summaryValue?.trim()
  const effort = effortValue?.trim()
  const reasoning: Record<string, string> = {}

  if (summary) reasoning.summary = summary
  if (effort) reasoning.effort = effort

  return Object.keys(reasoning).length > 0 ? reasoning : null
}

function supportsOpenAIReasoningOptions(model: string) {
  return /^(gpt-5|o\d|o[134](?:-|$))/i.test(model)
}

type OpenAITextPayload = {
  output_text?: string
  output?: unknown[]
  error?: { message?: string }
  status?: string
  incomplete_details?: { reason?: string }
}

function extractOpenAIText(payload: unknown) {
  if (!payload || typeof payload !== 'object') return ''
  const record = payload as Record<string, unknown>
  if (typeof record.output_text === 'string' && record.output_text.trim()) return record.output_text

  const chunks: string[] = []
  const output = Array.isArray(record.output) ? record.output : []
  for (const item of output) {
    if (!item || typeof item !== 'object') continue
    const outputItem = item as Record<string, unknown>
    if (outputItem.type !== 'message' || !Array.isArray(outputItem.content)) continue

    for (const part of outputItem.content) {
      if (!part || typeof part !== 'object') continue
      const contentPart = part as Record<string, unknown>
      if (
        (contentPart.type === 'output_text' || contentPart.type === 'text') &&
        typeof contentPart.text === 'string'
      ) {
        chunks.push(contentPart.text)
      }
    }
  }

  return chunks.join('').trim()
}

function parseGeneratedQuestions(content: string) {
  const parsed = parseJSON<GeneratedQuestion[] | { questions?: GeneratedQuestion[] }>(content)
  if (Array.isArray(parsed)) return parsed
  if (Array.isArray(parsed.questions)) return parsed.questions
  return []
}

function parseJSON<T>(content: string): T {
  return JSON.parse(normalizeJSONText(content)) as T
}

function normalizeJSONText(content: string) {
  const unfenced = content
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  const startArray = unfenced.indexOf('[')
  const startObject = unfenced.indexOf('{')
  const starts = [startArray, startObject].filter((index) => index >= 0)
  const start = starts.length > 0 ? Math.min(...starts) : 0
  const endArray = unfenced.lastIndexOf(']')
  const endObject = unfenced.lastIndexOf('}')
  const end = Math.max(endArray, endObject)
  const jsonLike = end >= start ? unfenced.slice(start, end + 1) : unfenced

  return jsonLike
    .replace(/,\s*([}\]])/g, '$1')
    .replace(/[\u0000-\u001F]+/g, (match) =>
      match === '\n' || match === '\r' || match === '\t' ? match : ''
    )
}
