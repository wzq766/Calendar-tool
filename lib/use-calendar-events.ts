'use client'

import { useState, useCallback, useEffect } from 'react'
import { CalendarEvent } from './types'
import {
  CALENDAR_EVENTS_STORAGE_KEY,
  deserializeCalendarEvents,
  serializeCalendarEvents,
} from './calendar-event-storage'

const eventColors = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
]

const initialEvents: CalendarEvent[] = [
  {
    id: '1',
    title: '团队周会',
    date: new Date(),
    time: '09:00',
    endTime: '10:00',
    color: '#3b82f6',
  },
  {
    id: '2',
    title: '产品评审',
    date: new Date(),
    time: '14:00',
    endTime: '15:30',
    color: '#22c55e',
  },
  {
    id: '3',
    title: '客户拜访',
    date: new Date(Date.now() + 86400000),
    time: '10:00',
    endTime: '11:30',
    color: '#f97316',
  },
]

function calculateReminderAt(event: Pick<CalendarEvent, 'date' | 'time' | 'remindBeforeMinutes'>): Date | undefined {
  if (event.remindBeforeMinutes === undefined) return undefined

  const [hour, minute] = event.time.split(':').map(Number)
  const startsAt = new Date(event.date)
  startsAt.setHours(hour, minute, 0, 0)
  startsAt.setMinutes(startsAt.getMinutes() - event.remindBeforeMinutes)
  return startsAt
}

export function useCalendarEvents() {
  const [isStorageLoaded, setIsStorageLoaded] = useState(false)
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const storedEvents = deserializeCalendarEvents(
      window.localStorage.getItem(CALENDAR_EVENTS_STORAGE_KEY)
    )

    if (storedEvents) {
      setEvents(storedEvents)
    }
    setIsStorageLoaded(true)
  }, [])

  useEffect(() => {
    if (!isStorageLoaded || typeof window === 'undefined') return

    window.localStorage.setItem(CALENDAR_EVENTS_STORAGE_KEY, serializeCalendarEvents(events))
  }, [events, isStorageLoaded])

  const addEvent = useCallback((event: Omit<CalendarEvent, 'id'>) => {
    const newEvent: CalendarEvent = {
      ...event,
      id: Date.now().toString(),
      color: event.color || eventColors[Math.floor(Math.random() * eventColors.length)],
    }
    newEvent.remindAt = calculateReminderAt(newEvent)
    setEvents(prev => [...prev, newEvent])
    return newEvent
  }, [])

  const deleteEvent = useCallback((eventId: string) => {
    setEvents(prev => prev.filter(e => e.id !== eventId))
  }, [])

  const deleteEventByTitle = useCallback((title: string): CalendarEvent | null => {
    const eventToDelete = events.find(e =>
      e.title.toLowerCase().includes(title.toLowerCase()) ||
      title.toLowerCase().includes(e.title.toLowerCase())
    )
    if (eventToDelete) {
      setEvents(prev => prev.filter(e => e.id !== eventToDelete.id))
      return eventToDelete
    }
    return null
  }, [events])

  const updateEvent = useCallback((eventId: string, updates: Partial<Omit<CalendarEvent, 'id'>>): CalendarEvent | null => {
    let updated: CalendarEvent | null = null
    setEvents(prev => prev.map(e => {
      if (e.id !== eventId) return e
      const merged = { ...e, ...updates }
      if (updates.date !== undefined || updates.time !== undefined || updates.remindBeforeMinutes !== undefined) {
        merged.remindAt = calculateReminderAt({
          date: merged.date,
          time: merged.time,
          remindBeforeMinutes: merged.remindBeforeMinutes,
        })
      }
      updated = merged
      return merged
    }))
    return updated
  }, [])

  const getEventsForDate = useCallback((date: Date): CalendarEvent[] => {
    return events.filter(e => {
      const eventDate = new Date(e.date)
      return (
        eventDate.getFullYear() === date.getFullYear() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getDate() === date.getDate()
      )
    }).sort((a, b) => a.time.localeCompare(b.time))
  }, [events])

  const getEventsForMonth = useCallback((year: number, month: number): CalendarEvent[] => {
    return events.filter(e => {
      const eventDate = new Date(e.date)
      return eventDate.getFullYear() === year && eventDate.getMonth() === month
    }).sort((a, b) => {
      const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime()
      if (dateCompare !== 0) return dateCompare
      return a.time.localeCompare(b.time)
    })
  }, [events])

  const getEventsForYear = useCallback((year: number): CalendarEvent[] => {
    return events.filter(e => {
      const eventDate = new Date(e.date)
      return eventDate.getFullYear() === year
    }).sort((a, b) => {
      const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime()
      if (dateCompare !== 0) return dateCompare
      return a.time.localeCompare(b.time)
    })
  }, [events])

  return {
    events,
    addEvent,
    deleteEvent,
    deleteEventByTitle,
    updateEvent,
    getEventsForDate,
    getEventsForMonth,
    getEventsForYear,
  }
}
