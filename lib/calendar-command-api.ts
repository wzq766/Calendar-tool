import { CalendarEvent, ParsedCalendarCommand } from './types'
import {
  DeepSeekCalendarCommand,
  toDeepSeekExistingEvents,
  toParsedCalendarCommand,
} from './deepseek-calendar-command'
import { parseVoiceCommand } from './voice-parser'

function todayKey(): string {
  const now = new Date()
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-')
}

export async function parseCalendarCommandWithDeepSeekFallback(
  text: string,
  existingEvents: CalendarEvent[]
): Promise<ParsedCalendarCommand> {
  try {
    const response = await fetch('/api/parse-command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        referenceDate: todayKey(),
        existingEvents: toDeepSeekExistingEvents(existingEvents),
      }),
    })

    if (!response.ok) {
      throw new Error(`DeepSeek parse failed: ${response.status}`)
    }

    const body = await response.json() as { command?: DeepSeekCalendarCommand }
    if (!body.command) {
      throw new Error('DeepSeek parse returned no command')
    }

    return toParsedCalendarCommand(body.command, text)
  } catch {
    return parseVoiceCommand(text, existingEvents)
  }
}
