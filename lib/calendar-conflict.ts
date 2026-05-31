import { CalendarEvent } from './types'

export interface ConflictInfo {
  event: CalendarEvent
  overlap: 'full' | 'partial'
}

/**
 * 检测新事件/修改事件是否与已有事件时间冲突。
 * 同一天内时间段有重叠即视为冲突。
 */
export function detectConflicts(
  date: Date,
  time: string,
  endTime: string,
  excludeEventId: string | undefined,
  existingEvents: CalendarEvent[]
): ConflictInfo[] {
  const proposedStart = timeToMinutes(time)
  const proposedEnd = timeToMinutes(endTime)
  if (proposedStart >= proposedEnd) return []

  return existingEvents.filter(e => {
    if (e.id === excludeEventId) return false
    const eventDate = new Date(e.date)
    if (!isSameDay(eventDate, date)) return false

    const existingStart = timeToMinutes(e.time)
    const existingEnd = e.endTime ? timeToMinutes(e.endTime) : existingStart + 60
    if (existingStart >= existingEnd) return false

    // 检查重叠
    return proposedStart < existingEnd && proposedEnd > existingStart
  }).map(e => {
    const overlap: 'full' | 'partial' =
      (proposedStart <= timeToMinutes(e.time) && proposedEnd >= (e.endTime ? timeToMinutes(e.endTime) : timeToMinutes(e.time) + 60))
        ? 'full' : 'partial'
    return { event: e, overlap }
  })
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function formatConflictMessage(conflicts: ConflictInfo[]): string {
  if (conflicts.length === 0) return ''
  const names = conflicts.map(c => `"${c.event.title}"(${c.event.time}${c.event.endTime ? '-' + c.event.endTime : ''})`).join('、')
  const hasFullOverlap = conflicts.some(c => c.overlap === 'full')
  return hasFullOverlap
    ? `⏰ 与已有事件完全重叠：${names}`
    : `⚠️ 与已有事件时间部分重叠：${names}`
}

/**
 * 为某天推荐第一个空闲 1 小时时段（08:00-20:00 范围内）。
 * 返回推荐时间 "HH:MM"，如果没有空闲则返回 "09:00"。
 */
export function suggestFreeTime(date: Date, existingEvents: CalendarEvent[]): string {
  const busySlots = existingEvents
    .filter(e => {
      const ed = new Date(e.date)
      return ed.getFullYear() === date.getFullYear() &&
        ed.getMonth() === date.getMonth() &&
        ed.getDate() === date.getDate()
    })
    .map(e => ({
      start: timeToMinutes(e.time),
      end: e.endTime ? timeToMinutes(e.endTime) : timeToMinutes(e.time) + 60,
    }))
    .sort((a, b) => a.start - b.start)

  let cursor = 8 * 60 // 08:00

  for (const slot of busySlots) {
    if (cursor + 60 <= slot.start) {
      // 有空隙
      break
    }
    cursor = Math.max(cursor, slot.end)
  }

  if (cursor + 60 > 20 * 60) {
    cursor = 9 * 60 // 没空闲则默认 09:00
  }

  const h = Math.floor(cursor / 60)
  const m = cursor % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}
