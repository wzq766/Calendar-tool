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

export type ViewMode = 'day' | 'week' | 'month' | 'year'

export interface ParsedCalendarCommand {
  action: 'add' | 'delete' | 'query' | 'edit' | 'unknown'
  originalText: string
  title?: string
  date?: Date
  time?: string
  endTime?: string
  description?: string
  remindBeforeMinutes?: number
  /** edit 专用：要修改的事件标题（用于匹配） */
  matchedEventId?: string
  newTitle?: string
  newDate?: Date
  newTime?: string
  newEndTime?: string
}
