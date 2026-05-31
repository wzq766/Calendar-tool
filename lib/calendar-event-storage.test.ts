import { describe, expect, test } from 'vitest'

import {
  deserializeCalendarEvents,
  serializeCalendarEvents,
} from './calendar-event-storage'
import { CalendarEvent } from './types'

describe('calendar event storage', () => {
  test('round trips event dates and reminder dates through JSON', () => {
    const events: CalendarEvent[] = [
      {
        id: 'event-1',
        title: '项目会',
        date: new Date(2026, 4, 31),
        time: '15:00',
        endTime: '16:00',
        color: '#3b82f6',
        remindBeforeMinutes: 30,
        remindAt: new Date(2026, 4, 31, 14, 30),
      },
    ]

    const stored = serializeCalendarEvents(events)
    const restored = deserializeCalendarEvents(stored)

    expect(restored).not.toBeNull()
    if (!restored) throw new Error('Expected stored events to deserialize')

    expect(restored).toHaveLength(1)
    expect(restored[0].date).toBeInstanceOf(Date)
    expect(restored[0].date.getFullYear()).toBe(2026)
    expect(restored[0].date.getMonth()).toBe(4)
    expect(restored[0].date.getDate()).toBe(31)
    expect(restored[0].remindBeforeMinutes).toBe(30)
    expect(restored[0].remindAt).toBeInstanceOf(Date)
    expect(restored[0].remindAt?.getHours()).toBe(14)
    expect(restored[0].remindAt?.getMinutes()).toBe(30)
  })

  test('returns null for invalid stored data', () => {
    expect(deserializeCalendarEvents('not json')).toBeNull()
    expect(deserializeCalendarEvents(JSON.stringify({ events: [] }))).toBeNull()
  })
})
