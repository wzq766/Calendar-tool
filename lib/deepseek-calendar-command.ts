import { CalendarEvent, ParsedCalendarCommand } from './types'

export interface DeepSeekCalendarCommand {
  action: 'add' | 'delete' | 'query' | 'edit' | 'unknown'
  title?: string
  date?: string
  time?: string
  endTime?: string
  description?: string
  remindBeforeMinutes?: number
  confidence?: number
  /** edit 专用 */
  newTitle?: string
  newDate?: string
  newTime?: string
  newEndTime?: string
  /** query 专用 */
  viewScope?: string
  keyword?: string
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

const validActions = new Set(['add', 'delete', 'query', 'edit', 'unknown'])

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

export function parseDeepSeekCalendarCommands(content: string): DeepSeekCalendarCommand[] {
  try {
    const json = extractJson(content)
    const parsed = JSON.parse(json) as Record<string, unknown>

    // 多事件：commands 数组
    if (Array.isArray(parsed.commands) && parsed.commands.length > 0) {
      return (parsed.commands as Record<string, unknown>[])
        .map(cmd => parseSingleCommand(cmd))
        .filter((c): c is DeepSeekCalendarCommand => c !== null)
    }

    // 单事件：顶层字段
    const cmd = parseSingleCommand(parsed)
    return cmd ? [cmd] : []
  } catch {
    return []
  }
}

function parseSingleCommand(parsed: Record<string, unknown>): DeepSeekCalendarCommand | null {
  try {
    let action = typeof parsed.action === 'string' && validActions.has(parsed.action)
      ? parsed.action as DeepSeekCalendarCommand['action']
      : 'unknown'

    // 有标题和时间的事件默认为 add
    const hasTitle = typeof parsed.title === 'string' && parsed.title.trim()
    const hasTime = isTime(parsed.time)
    if (action === 'unknown' && hasTitle && hasTime) {
      action = 'add'
    }

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

    // edit 专用字段
    if (typeof parsed.newTitle === 'string' && parsed.newTitle.trim()) {
      command.newTitle = parsed.newTitle.trim()
    }
    if (typeof parsed.newDate === 'string' && toLocalDate(parsed.newDate)) {
      command.newDate = parsed.newDate
    }
    if (isTime(parsed.newTime)) {
      command.newTime = parsed.newTime
    }
    if (isTime(parsed.newEndTime)) {
      command.newEndTime = parsed.newEndTime
    }

    // query 专用
    if (typeof parsed.viewScope === 'string' && ['day','week','month','year'].includes(parsed.viewScope)) {
      command.viewScope = parsed.viewScope
    }
    if (typeof parsed.keyword === 'string' && parsed.keyword.trim()) {
      command.keyword = parsed.keyword.trim()
    }

    return command
  } catch {
    return null
  }
}

export function parseDeepSeekCalendarContent(content: string): DeepSeekCalendarCommand | null {
  const commands = parseDeepSeekCalendarCommands(content)
  return commands[0] || null
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
    newTitle: command.newTitle,
    newDate: command.newDate ? toLocalDate(command.newDate) : undefined,
    newTime: command.newTime,
    newEndTime: command.newEndTime,
    viewScope: (command.viewScope as ParsedCalendarCommand['viewScope']) || undefined,
    keyword: command.keyword,
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
        'JSON 字段：action, title, date, time, endTime, description, remindBeforeMinutes, confidence, commands。',
        'action 只能是 add、delete、query、edit、unknown。',
        'date 必须是 YYYY-MM-DD；time/endTime 必须是 HH:mm 的 24 小时制。',
        '如果用户没有说结束时间，添加事件可默认 endTime 为开始后 1 小时。',
        'remindBeforeMinutes 是提前提醒分钟数；没有提醒则省略。',
        '信息不确定时把 confidence 设低，但仍尽量提取可确认字段。',
        '【重要】一句话含多个事件时必须用 commands 数组：[{title,time,...}]。单事件用顶层字段。',
        '编辑事件用 action:"edit"：title 是要修改的原事件名（从 existingEvents 匹配），newTitle/newDate/newTime/newEndTime 是修改后的值，未提及的字段不返回。',
        '查询事件用 action:"query"。date 是查看的日期。viewScope 可选 day/week/month/year 表示查看范围。keyword 可选表示搜索关键词。如"下周有什么安排"→action:"query",viewScope:"week"。',
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
