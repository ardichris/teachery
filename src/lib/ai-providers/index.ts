import {
  buildImageGenerationPromptWithDeepSeek,
  generateDiagramSVGWithDeepSeek,
  generateQuestionsWithDeepSeek,
} from './deepseek'
import {
  buildImageGenerationPromptWithOpenAI,
  generateDiagramSVGWithOpenAI,
  generateQuestionsWithOpenAI,
} from './openai'
import type { BuildImagePromptRequest, GenerateDiagramRequest, GenerateQuestionsRequest } from './types'

type AIProvider = 'DEEPSEEK' | 'OPENAI'

export async function generateQuestionsWithProvider(request: GenerateQuestionsRequest) {
  const provider = providerName(process.env.AI_PROVIDER_GENERATE_QUESTION || 'DEEPSEEK')

  if (provider === 'DEEPSEEK') return generateQuestionsWithDeepSeek(request)
  if (provider === 'OPENAI') return generateQuestionsWithOpenAI(request)

  throw new Error(`Provider generate question tidak didukung: ${provider}`)
}

export async function generateDiagramSVGWithProvider(request: GenerateDiagramRequest) {
  const provider = providerName(
    process.env.AI_PROVIDER_GENERATE_DIAGRAM_SVG ||
      process.env.AI_PROVIDER_GENERATE_DIAGRAM_IMAGE ||
      'DEEPSEEK'
  )

  if (provider === 'OPENAI') return generateDiagramSVGWithOpenAI(request)
  if (provider === 'DEEPSEEK') return generateDiagramSVGWithDeepSeek(request)

  throw new Error(`Provider generate diagram SVG tidak didukung: ${provider}`)
}

export async function buildImageGenerationPromptWithProvider(request: BuildImagePromptRequest) {
  const provider = providerName(process.env.AI_PROVIDER_GENERATE_IMAGE_PROMPT || 'DEEPSEEK')

  if (provider === 'OPENAI') return buildImageGenerationPromptWithOpenAI(request.prompt)
  if (provider === 'DEEPSEEK') return buildImageGenerationPromptWithDeepSeek(request)

  throw new Error(`Provider generate image prompt tidak didukung: ${provider}`)
}

function providerName(value: string): AIProvider | string {
  return value.trim().toUpperCase()
}
