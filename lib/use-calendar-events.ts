'use client'

import { useState, useCallback } from 'react'
import { CalendarEvent } from './types'

const eventColors = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
]

export function useCalendarEvents() {
  const [events, setEvents] = useState<CalendarEvent[]>([
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
  ])

  const addEvent = useCallback((event: Omit<CalendarEvent, 'id'>) => {
    const newEvent: CalendarEvent = {
      ...event,
      id: Date.now().toString(),
      color: event.color || eventColors[Math.floor(Math.random() * eventColors.length)],
    }
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
    getEventsForDate,
    getEventsForMonth,
    getEventsForYear,
  }
}
