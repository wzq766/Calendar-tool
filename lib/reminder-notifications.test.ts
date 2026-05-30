import { describe, expect, test } from 'vitest'

import { getReminderDelay } from './reminder-notifications'
import { CalendarEvent } from './types'

describe('reminder notifications', () => {
  test('calculates the delay until an event reminder', () => {
    const event: CalendarEvent = {
      id: 'event-1',
      title: '项目会',
      date: new Date(2026, 4, 31),
      time: '15:00',
      remindBeforeMinutes: 30,
    }

    const delay = getReminderDelay(event, new Date(2026, 4, 31, 14, 0))

    expect(delay).toBe(30 * 60 * 1000)
  })

  test('returns null when the reminder is missing or already past', () => {
    const event: CalendarEvent = {
      id: 'event-1',
      title: '项目会',
      date: new Date(2026, 4, 31),
      time: '15:00',
    }

    expect(getReminderDelay(event, new Date(2026, 4, 31, 14, 0))).toBeNull()
    expect(
      getReminderDelay(
        { ...event, remindBeforeMinutes: 30 },
        new Date(2026, 4, 31, 14, 31)
      )
    ).toBeNull()
  })
})
