export interface TranscriptionConfig {
  apiKey?: string
  baseUrl: string
  model: string
}

type EnvLike = Record<string, string | undefined>

export function getTranscriptionConfig(env: EnvLike = process.env): TranscriptionConfig {
  return {
    apiKey: env.ASR_API_KEY || env.OPENAI_API_KEY,
    baseUrl: env.ASR_BASE_URL || 'https://api.openai.com/v1',
    model: env.ASR_MODEL || 'gpt-4o-mini-transcribe',
  }
}

export function buildTranscriptionFormData(
  audio: Blob,
  filename: string,
  model: string
): FormData {
  const formData = new FormData()
  formData.set('file', new File([audio], filename, { type: audio.type || 'audio/webm' }))
  formData.set('model', model)
  formData.set('language', 'zh')
  return formData
}

export function parseTranscriptionResponse(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null

  const text = (value as { text?: unknown }).text
  if (typeof text !== 'string' || !text.trim()) return null

  return text.trim()
}
