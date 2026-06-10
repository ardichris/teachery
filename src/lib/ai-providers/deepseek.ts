import type {
  BuildImagePromptRequest,
  GeneratedQuestion,
  GenerateDiagramRequest,
  GenerateQuestionsRequest,
} from './types'

export async function generateQuestionsWithDeepSeek(request: GenerateQuestionsRequest) {
  const content = await callDeepSeekText(buildDeepSeekQuestionRequest(request), 'DeepSeek gagal generate soal.')

  const questions = parseGeneratedQuestions(content)
  if (questions.length === 0) {
    throw new Error('DeepSeek tidak mengembalikan daftar soal yang valid.')
  }

  return questions
}

export async function buildImageGenerationPromptWithDeepSeek(request: BuildImagePromptRequest) {
  const content = await callDeepSeekText(
    buildDeepSeekTextRequest({
      model: process.env.DEEPSEEK_IMAGE_PROMPT_MODEL || process.env.DEEPSEEK_QUESTION_MODEL || 'deepseek-v4-pro',
      system: 'You write precise English image-generation prompts. Return only the final prompt.',
      prompt: request.prompt,
      maxTokens: request.maxTokens,
      thinking: process.env.DEEPSEEK_IMAGE_PROMPT_THINKING || process.env.DEEPSEEK_QUESTION_THINKING || 'enabled',
      reasoningEffort:
        process.env.DEEPSEEK_IMAGE_PROMPT_REASONING_EFFORT ||
        process.env.DEEPSEEK_QUESTION_REASONING_EFFORT ||
        'high',
    }),
    'DeepSeek gagal membuat prompt gambar.'
  )

  if (!content) throw new Error('DeepSeek tidak mengembalikan prompt gambar.')
  return content
}

export async function generateDiagramSVGWithDeepSeek(request: GenerateDiagramRequest) {
  const content = await callDeepSeekText(
    buildDeepSeekTextRequest({
      model: process.env.DEEPSEEK_DIAGRAM_MODEL || process.env.DEEPSEEK_QUESTION_MODEL || 'deepseek-v4-pro',
      system: 'You generate valid SVG documents only. Return one complete SVG document and no explanation.',
      prompt: request.prompt,
      maxTokens: request.maxTokens,
      thinking: process.env.DEEPSEEK_DIAGRAM_THINKING || process.env.DEEPSEEK_QUESTION_THINKING || 'enabled',
      reasoningEffort:
        process.env.DEEPSEEK_DIAGRAM_REASONING_EFFORT ||
        process.env.DEEPSEEK_QUESTION_REASONING_EFFORT ||
        'high',
    }),
    'DeepSeek gagal membuat diagram SVG.'
  )

  if (!content) throw new Error('DeepSeek tidak mengembalikan SVG diagram.')
  return content
}

function buildDeepSeekQuestionRequest(request: GenerateQuestionsRequest) {
  return buildDeepSeekTextRequest({
    model: process.env.DEEPSEEK_QUESTION_MODEL || 'deepseek-v4-pro',
    system: 'You are an expert Indonesian teacher who writes valid JSON assessment questions only.',
    prompt: request.prompt,
    maxTokens: request.maxTokens,
    thinking: process.env.DEEPSEEK_QUESTION_THINKING || 'enabled',
    reasoningEffort: process.env.DEEPSEEK_QUESTION_REASONING_EFFORT || 'high',
  })
}

function buildDeepSeekTextRequest(input: {
  model: string
  system: string
  prompt: string
  maxTokens: number
  thinking: string
  reasoningEffort: string
}) {
  return {
    model: input.model,
    messages: [
      { role: 'system', content: input.system },
      { role: 'user', content: input.prompt },
    ],
    max_tokens: input.maxTokens,
    thinking: { type: input.thinking },
    reasoning_effort: input.reasoningEffort,
    stream: false,
  }
}

async function callDeepSeekText(requestBody: unknown, fallbackMessage: string) {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) throw new Error('DEEPSEEK_API_KEY belum diisi.')

  const response = await fetch(process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  })

  const payload = (await response.json().catch(() => ({}))) as {
    choices?: {
      message?: {
        content?: string
        reasoning_content?: string
      }
      text?: string
    }[]
    error?: { message?: string }
  }

  if (!response.ok) {
    throw new Error(payload.error?.message || `${fallbackMessage} HTTP ${response.status}`)
  }

  return (
    payload.choices?.[0]?.message?.content?.trim() ||
    payload.choices?.[0]?.text?.trim() ||
    ''
  )
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
