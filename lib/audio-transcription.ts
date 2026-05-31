export type TranscriptionProvider = 'openai' | 'dashscope'

export interface TranscriptionConfig {
  apiKey?: string
  baseUrl: string
  model: string
  provider: TranscriptionProvider
}

type EnvLike = Record<string, string | undefined>

function detectProvider(baseUrl: string): TranscriptionProvider {
  if (baseUrl.includes('dashscope')) return 'dashscope'
  return 'openai'
}

export function getTranscriptionConfig(env: EnvLike = process.env): TranscriptionConfig {
  const baseUrl = env.ASR_BASE_URL || ''
  const provider = detectProvider(baseUrl)

  return {
    apiKey: env.ASR_API_KEY || env.OPENAI_API_KEY,
    baseUrl: baseUrl || (
      provider === 'dashscope'
        ? 'https://dashscope.aliyuncs.com/compatible-mode/v1'
        : 'https://api.openai.com/v1'
    ),
    model: env.ASR_MODEL || (provider === 'dashscope' ? 'qwen3-asr-flash' : 'gpt-4o-mini-transcribe'),
    provider,
  }
}

/** OpenAI-style: multipart form data POST to /audio/transcriptions */
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

/** DashScope-style: base64 JSON body POST to /chat/completions */
export async function buildDashScopeRequestBody(
  audio: Blob,
  model: string
): Promise<string> {
  const arrayBuffer = await audio.arrayBuffer()
  const base64 = Buffer.from(arrayBuffer).toString('base64')
  const mimeType = audio.type || 'audio/webm'
  const dataUri = `data:${mimeType};base64,${base64}`

  return JSON.stringify({
    model,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'input_audio',
            input_audio: {
              data: dataUri,
              format: formatFromMimeType(mimeType),
            },
          },
        ],
      },
    ],
  })
}

function formatFromMimeType(mimeType: string): string {
  if (mimeType.includes('wav')) return 'wav'
  if (mimeType.includes('mp3') || mimeType.includes('mpeg')) return 'mp3'
  if (mimeType.includes('ogg')) return 'ogg'
  if (mimeType.includes('flac')) return 'flac'
  if (mimeType.includes('mp4') || mimeType.includes('aac')) return 'aac'
  return 'webm'
}

export function parseTranscriptionResponse(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null

  // OpenAI /audio/transcriptions format: { text: "..." }
  const openaiText = (value as { text?: unknown }).text
  if (typeof openaiText === 'string' && openaiText.trim()) {
    return openaiText.trim()
  }

  // DashScope /chat/completions format: { choices: [{ message: { content: "..." } }] }
  const choices = (value as { choices?: Array<{ message?: { content?: string } }> }).choices
  if (choices?.[0]?.message?.content) {
    return choices[0].message.content.trim()
  }

  return null
}

export function getTranscriptionErrorMessage(status: number): string {
  switch (status) {
    case 400:
      return 'ASR 请求无效。请确认录音格式受服务支持，或尝试缩短录音后重试。'
    case 401:
      return 'ASR_API_KEY 无效，或它不属于当前 ASR_BASE_URL 对应的服务。请更换为有效的 API Key。'
    case 403:
      return 'ASR_API_KEY 没有语音转写权限，或当前账号无权使用所选 ASR_MODEL。'
    case 404:
      return 'ASR_BASE_URL 或 ASR_MODEL 不支持语音转写，请检查服务商地址和模型名称。'
    case 429:
      return 'ASR 服务额度不足或请求过于频繁，请稍后重试或检查账号额度。'
    default:
      return `ASR 服务调用失败，状态码 ${status}。请检查 ASR_BASE_URL、ASR_MODEL 和服务商状态。`
  }
}
