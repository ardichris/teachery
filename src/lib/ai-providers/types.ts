export type GeneratedQuestion = {
  type?: string
  difficulty?: string
  prompt?: string
  image_url?: string
  correct_answer?: string
  explanation?: string
  blueprint_item?: string
  answer_options?: {
    id?: string
    label?: string
    text?: string
    is_correct?: boolean
  }[]
}

export type GenerateQuestionsRequest = {
  prompt: string
  count: number
  maxTokens: number
}

export type GenerateDiagramRequest = {
  prompt: string
  maxTokens: number
}

export type BuildImagePromptRequest = {
  prompt: string
  maxTokens: number
}
