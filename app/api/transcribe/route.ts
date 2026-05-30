import { NextRequest, NextResponse } from 'next/server'
import { execFile } from 'child_process'
import { promisify } from 'util'

import {
  buildTranscriptionFormData,
  buildDashScopeRequestBody,
  getTranscriptionErrorMessage,
  getTranscriptionConfig,
  parseTranscriptionResponse,
} from '@/lib/audio-transcription'

export const runtime = 'nodejs'

const execFileAsync = promisify(execFile)

function extensionForMimeType(type: string) {
  if (type.includes('mp4')) return 'mp4'
  if (type.includes('mpeg')) return 'mp3'
  if (type.includes('wav')) return 'wav'
  if (type.includes('ogg')) return 'ogg'
  return 'webm'
}

async function curlJsonPost(
  url: string,
  headers: Record<string, string>,
  body: string
): Promise<{ status: number; body: unknown }> {
  const args = ['-s', '-w', '\n__HTTP_STATUS__:%{http_code}', '--connect-timeout', '10', '--max-time', '60']
  args.push('-X', 'POST')
  for (const [k, v] of Object.entries(headers)) {
    args.push('-H', `${k}: ${v}`)
  }
  args.push('-d', body)
  args.push(url)

  const { stdout } = await execFileAsync('curl', args, {
    maxBuffer: 10 * 1024 * 1024,
    timeout: 65000,
  })

  const statusMarker = stdout.lastIndexOf('__HTTP_STATUS__:')
  const responseBody = stdout.slice(0, statusMarker).trim()
  const statusStr = stdout.slice(statusMarker + '__HTTP_STATUS__:'.length).trim()
  const status = parseInt(statusStr, 10) || 502

  let parsed: unknown
  try {
    parsed = JSON.parse(responseBody)
  } catch {
    parsed = { raw: responseBody }
  }

  return { status, body: parsed }
}

export async function POST(request: NextRequest) {
  const { apiKey, baseUrl, model, provider } = getTranscriptionConfig()

  if (!apiKey) {
    return NextResponse.json(
      { error: 'ASR_API_KEY or OPENAI_API_KEY is not configured' },
      { status: 503 }
    )
  }

  const formData = await request.formData().catch(() => null)
  const audio = formData?.get('audio')

  if (!(audio instanceof Blob) || audio.size === 0) {
    return NextResponse.json({ error: 'audio is required' }, { status: 400 })
  }

  if (provider === 'dashscope') {
    const body = await buildDashScopeRequestBody(audio, model)
    const { status, body: result } = await curlJsonPost(
      `${baseUrl}/chat/completions`,
      {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body
    )

    if (!(status >= 200 && status < 300)) {
      const message = getTranscriptionErrorMessage(status)
      return NextResponse.json(
        { error: 'ASR request failed', message, status },
        { status: 502 }
      )
    }

    const text = parseTranscriptionResponse(result)
    if (!text) {
      return NextResponse.json(
        { error: 'ASR returned empty transcript', message: '没有识别到语音内容，请重试。' },
        { status: 502 }
      )
    }

    return NextResponse.json({ text })
  }

  // OpenAI path — use multipart form via curl
  const filename = `/tmp/asr_upload_${Date.now()}.${extensionForMimeType(audio.type)}`
  await audio.arrayBuffer().then(buf => require('fs').promises.writeFile(filename, Buffer.from(buf)))

  const args = [
    '-s', '-w', '\n__HTTP_STATUS__:%{http_code}',
    '--connect-timeout', '10', '--max-time', '60',
    '-X', 'POST',
    '-H', `Authorization: Bearer ${apiKey}`,
    '-F', `file=@${filename};type=${audio.type || 'audio/webm'}`,
    '-F', `model=${model}`,
    '-F', 'language=zh',
    `${baseUrl}/audio/transcriptions`,
  ]

  try {
    const { stdout } = await execFileAsync('curl', args, {
      maxBuffer: 10 * 1024 * 1024,
      timeout: 65000,
    })

    require('fs').promises.unlink(filename).catch(() => {})

    const statusMarker = stdout.lastIndexOf('__HTTP_STATUS__:')
    const responseBody = stdout.slice(0, statusMarker).trim()
    const statusStr = stdout.slice(statusMarker + '__HTTP_STATUS__:'.length).trim()
    const status = parseInt(statusStr, 10) || 502

    if (!(status >= 200 && status < 300)) {
      const message = getTranscriptionErrorMessage(status)
      return NextResponse.json(
        { error: 'ASR request failed', message, status },
        { status: 502 }
      )
    }

    let parsed: unknown
    try { parsed = JSON.parse(responseBody) } catch { parsed = {} }

    const text = parseTranscriptionResponse(parsed)
    if (!text) {
      return NextResponse.json(
        { error: 'ASR returned empty transcript', message: '没有识别到语音内容，请重试。' },
        { status: 502 }
      )
    }

    return NextResponse.json({ text })
  } finally {
    require('fs').promises.unlink(filename).catch(() => {})
  }
}
