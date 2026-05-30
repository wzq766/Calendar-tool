import { NextRequest, NextResponse } from 'next/server'

import {
  buildTranscriptionFormData,
  getTranscriptionErrorMessage,
  getTranscriptionConfig,
  parseTranscriptionResponse,
} from '@/lib/audio-transcription'

export const runtime = 'nodejs'

function extensionForMimeType(type: string) {
  if (type.includes('mp4')) return 'mp4'
  if (type.includes('mpeg')) return 'mp3'
  if (type.includes('wav')) return 'wav'
  if (type.includes('ogg')) return 'ogg'
  return 'webm'
}

export async function POST(request: NextRequest) {
  const { apiKey, baseUrl, model } = getTranscriptionConfig()

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

  const filename = `speech.${extensionForMimeType(audio.type)}`
  const transcriptionFormData = buildTranscriptionFormData(audio, filename, model)
  const response = await fetch(`${baseUrl}/audio/transcriptions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: transcriptionFormData,
  })

  if (!response.ok) {
    const message = getTranscriptionErrorMessage(response.status)

    return NextResponse.json(
      { error: 'ASR request failed', message, status: response.status },
      { status: 502 }
    )
  }

  const result = await response.json()
  const text = parseTranscriptionResponse(result)

  if (!text) {
    return NextResponse.json({ error: 'ASR returned empty transcript' }, { status: 502 })
  }

  return NextResponse.json({ text })
}
