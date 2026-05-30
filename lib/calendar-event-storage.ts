import { CalendarEvent } from './types'

export const CALENDAR_EVENTS_STORAGE_KEY = 'voice-calendar-events-v1'

type StoredCalendarEvent = Omit<CalendarEvent, 'date' | 'remindAt'> & {
  date: string
  remindAt?: string
}

function isStoredCalendarEvent(value: unknown): value is StoredCalendarEvent {
  if (!value || typeof value !== 'object') return false

  const event = value as Partial<StoredCalendarEvent>
  return (
    typeof event.id === 'string' &&
    typeof event.title === 'string' &&
    typeof event.date === 'string' &&
    typeof event.time === 'string'
  )
}

export function serializeCalendarEvents(events: CalendarEvent[]): string {
  const storedEvents: StoredCalendarEvent[] = events.map((event) => ({
    ...event,
    date: event.date.toISOString(),
    remindAt: event.remindAt?.toISOString(),
  }))

  return JSON.stringify(storedEvents)
}

export function deserializeCalendarEvents(value: string | null): CalendarEvent[] | null {
  if (!value) return null

  try {
    const parsed = JSON.parse(value)
    if (!Array.isArray(parsed) || !parsed.every(isStoredCalendarEvent)) {
      return null
    }

    return parsed.map((event) => ({
      ...event,
      date: new Date(event.date),
      remindAt: event.remindAt ? new Date(event.remindAt) : undefined,
    }))
  } catch {
    return null
  }
}
