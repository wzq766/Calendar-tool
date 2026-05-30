import { NextRequest, NextResponse } from 'next/server'

import {
  buildDeepSeekCalendarMessages,
  parseDeepSeekCalendarContent,
} from '@/lib/deepseek-calendar-command'

export const runtime = 'nodejs'

interface ParseCommandRequest {
  text?: unknown
  referenceDate?: unknown
  existingEvents?: unknown
}

const deepSeekBaseUrl = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com'
const deepSeekModel = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash'

function isExistingEvent(value: unknown) {
  if (!value || typeof value !== 'object') return false
  const event = value as Record<string, unknown>

  return (
    typeof event.id === 'string' &&
    typeof event.title === 'string' &&
    typeof event.date === 'string' &&
    typeof event.time === 'string'
  )
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'DEEPSEEK_API_KEY is not configured' }, { status: 503 })
  }

  const body = await request.json().catch(() => null) as ParseCommandRequest | null
  const text = typeof body?.text === 'string' ? body.text.trim() : ''
  const referenceDate = typeof body?.referenceDate === 'string' ? body.referenceDate : ''
  const existingEvents = Array.isArray(body?.existingEvents)
    ? body.existingEvents.filter(isExistingEvent)
    : []

  if (!text) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 })
  }

  const response = await fetch(`${deepSeekBaseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: deepSeekModel,
      messages: buildDeepSeekCalendarMessages({
        text,
        referenceDate: referenceDate || new Date().toISOString().slice(0, 10),
        existingEvents,
      }),
      response_format: { type: 'json_object' },
      temperature: 0,
    }),
  })

  if (!response.ok) {
    return NextResponse.json(
      { error: 'DeepSeek request failed', status: response.status },
      { status: 502 }
    )
  }

  const result = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const content = result.choices?.[0]?.message?.content

  if (!content) {
    return NextResponse.json({ error: 'DeepSeek returned empty content' }, { status: 502 })
  }

  const command = parseDeepSeekCalendarContent(content)
  if (!command) {
    return NextResponse.json({ error: 'DeepSeek returned invalid JSON' }, { status: 502 })
  }

  return NextResponse.json({ command })
}
