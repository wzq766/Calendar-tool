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

export function getTranscriptionErrorMessage(status: number): string {
  switch (status) {
    case 400:
      return 'ASR 请求无效。请确认录音格式受服务支持，或尝试缩短录音后重试。'
    case 401:
      return 'ASR_API_KEY 无效，或它不属于当前 ASR_BASE_URL 对应的服务。请更换为 OpenAI 兼容语音转写服务的有效 Key。'
    case 403:
      return 'ASR_API_KEY 没有语音转写权限，或当前账号无权使用所选 ASR_MODEL。'
    case 404:
      return 'ASR_BASE_URL 或 ASR_MODEL 不支持 /audio/transcriptions，请检查服务商地址和模型名称。'
    case 429:
      return 'ASR 服务额度不足或请求过于频繁，请稍后重试或检查账号额度。'
    default:
      return `ASR 服务调用失败，状态码 ${status}。请检查 ASR_BASE_URL、ASR_MODEL 和服务商状态。`
  }
}
