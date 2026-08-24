export type ChatRole = 'system' | 'user' | 'assistant'

export type ChatMessage = {
  role: ChatRole
  content: string
}

export type ChatRequest = {
  messages?: ChatMessage[]
  recaptchaToken?: string
}

export type GroqResponse = {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
  usage?: {
    prompt_tokens?: number
    completion_tokens?: number
    total_tokens?: number
  }
}

export function sanitizeMessages(payload: ChatRequest): ChatMessage[] {
  return (
    payload.messages?.filter(
      (message): message is ChatMessage =>
        Boolean(message?.content) && ['system', 'user', 'assistant'].includes(message.role),
    ) ?? []
  )
}
