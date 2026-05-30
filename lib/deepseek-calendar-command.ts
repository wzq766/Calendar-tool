import { CalendarEvent, ParsedCalendarCommand } from './types'

export interface DeepSeekCalendarCommand {
  action: 'add' | 'delete' | 'query' | 'unknown'
  title?: string
  date?: string
  time?: string
  endTime?: string
  description?: string
  remindBeforeMinutes?: number
  confidence?: number
}

export interface DeepSeekPromptInput {
  text: string
  referenceDate: string
  existingEvents?: Array<{
    id: string
    title: string
    date: string
    time: string
    endTime?: string
  }>
}

interface ChatMessage {
  role: 'system' | 'user'
  content: string
}

const validActions = new Set(['add', 'delete', 'query', 'unknown'])

function toLocalDate(value: string): Date | undefined {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return undefined

  const [, year, month, day] = match
  return new Date(Number(year), Number(month) - 1, Number(day))
}

function extractJson(content: string): string {
  const trimmed = content.trim()
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/)
  if (fenced?.[1]) return fenced[1].trim()

  const firstBrace = trimmed.indexOf('{')
  const lastBrace = trimmed.lastIndexOf('}')
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1)
  }

  return trimmed
}

function isTime(value: unknown): value is string {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
}

function normalizeReminder(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
  if (value < 0 || value > 60 * 24 * 7) return undefined
  return Math.round(value)
}

export function parseDeepSeekCalendarContent(content: string): DeepSeekCalendarCommand | null {
  try {
    const parsed = JSON.parse(extractJson(content)) as Record<string, unknown>
    const action = typeof parsed.action === 'string' && validActions.has(parsed.action)
      ? parsed.action as DeepSeekCalendarCommand['action']
      : 'unknown'

    const command: DeepSeekCalendarCommand = { action }

    if (typeof parsed.title === 'string' && parsed.title.trim()) {
      command.title = parsed.title.trim()
    }
    if (typeof parsed.date === 'string' && toLocalDate(parsed.date)) {
      command.date = parsed.date
    }
    if (isTime(parsed.time)) {
      command.time = parsed.time
    }
    if (isTime(parsed.endTime)) {
      command.endTime = parsed.endTime
    }
    if (typeof parsed.description === 'string' && parsed.description.trim()) {
      command.description = parsed.description.trim()
    }

    const remindBeforeMinutes = normalizeReminder(parsed.remindBeforeMinutes)
    if (remindBeforeMinutes !== undefined) {
      command.remindBeforeMinutes = remindBeforeMinutes
    }

    if (typeof parsed.confidence === 'number' && Number.isFinite(parsed.confidence)) {
      command.confidence = Math.min(1, Math.max(0, parsed.confidence))
    }

    return command
  } catch {
    return null
  }
}

export function toParsedCalendarCommand(
  command: DeepSeekCalendarCommand,
  originalText: string
): ParsedCalendarCommand {
  return {
    action: command.action,
    originalText,
    title: command.title,
    date: command.date ? toLocalDate(command.date) : undefined,
    time: command.time,
    endTime: command.endTime,
    description: command.description,
    remindBeforeMinutes: command.remindBeforeMinutes,
  }
}

export function toDeepSeekExistingEvents(events: CalendarEvent[]) {
  return events.slice(0, 20).map((event) => {
    const date = new Date(event.date)

    return {
      id: event.id,
      title: event.title,
      date: [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0'),
      ].join('-'),
      time: event.time,
      endTime: event.endTime,
    }
  })
}

export function buildDeepSeekCalendarMessages(input: DeepSeekPromptInput): ChatMessage[] {
  return [
    {
      role: 'system',
      content: [
        '你是语音日历工具的中文日历指令解析器，只返回 JSON，不要解释，不要使用 Markdown。',
        'JSON 字段：action, title, date, time, endTime, description, remindBeforeMinutes, confidence。',
        'action 只能是 add、delete、query、unknown。',
        'date 必须是 YYYY-MM-DD；time/endTime 必须是 HH:mm 的 24 小时制。',
        '如果用户没有说结束时间，添加事件可默认 endTime 为开始后 1 小时。',
        'remindBeforeMinutes 是提前提醒分钟数；没有提醒则省略。',
        '信息不确定时把 confidence 设低，但仍尽量提取可确认字段。',
      ].join('\n'),
    },
    {
      role: 'user',
      content: JSON.stringify({
        referenceDate: input.referenceDate,
        text: input.text,
        existingEvents: input.existingEvents ?? [],
      }),
    },
  ]
}
