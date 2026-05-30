import { useEffect } from 'react'

import { CalendarEvent } from './types'

function getEventStartAt(event: CalendarEvent): Date {
  const [hour, minute] = event.time.split(':').map(Number)
  const startsAt = new Date(event.date)
  startsAt.setHours(hour, minute, 0, 0)
  return startsAt
}

export function getReminderDelay(event: CalendarEvent, now: Date = new Date()): number | null {
  if (event.remindBeforeMinutes === undefined) return null

  const remindAt = event.remindAt ? new Date(event.remindAt) : getEventStartAt(event)
  if (!event.remindAt) {
    remindAt.setMinutes(remindAt.getMinutes() - event.remindBeforeMinutes)
  }

  const delay = remindAt.getTime() - now.getTime()
  return delay > 0 ? delay : null
}

export function useEventReminderNotifications(events: CalendarEvent[]) {
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return
    if (Notification.permission !== 'granted') return

    const timeoutIds = events.flatMap((event) => {
      const delay = getReminderDelay(event)
      if (delay === null) return []

      const timeoutId = window.setTimeout(() => {
        new Notification(`日程提醒：${event.title}`, {
          body: `${event.time}${event.endTime ? `-${event.endTime}` : ''}`,
        })
      }, delay)

      return [timeoutId]
    })

    return () => {
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId))
    }
  }, [events])
}
