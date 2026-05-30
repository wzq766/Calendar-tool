export interface CalendarEvent {
  id: string
  title: string
  date: Date
  time: string
  endTime?: string
  description?: string
  color?: string
  remindBeforeMinutes?: number
  remindAt?: Date
}

export type ViewMode = 'day' | 'month' | 'year'

export interface ParsedCalendarCommand {
  action: 'add' | 'delete' | 'query' | 'unknown'
  originalText: string
  title?: string
  date?: Date
  time?: string
  endTime?: string
  description?: string
  remindBeforeMinutes?: number
}
