'use client'

import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CalendarEvent } from '@/lib/types'

interface MiniCalendarProps {
  selectedDate: Date
  onSelectDate: (date: Date) => void
  events: CalendarEvent[]
  currentMonth: Date
  onMonthChange: (date: Date) => void
}

const weekDays = ['日', '一', '二', '三', '四', '五', '六']

export function MiniCalendar({
  selectedDate,
  onSelectDate,
  events,
  currentMonth,
  onMonthChange,
}: MiniCalendarProps) {
  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()

  const firstDayOfMonth = new Date(year, month, 1)
  const lastDayOfMonth = new Date(year, month + 1, 0)
  const firstDayWeekday = firstDayOfMonth.getDay()
  const daysInMonth = lastDayOfMonth.getDate()

  const prevMonth = () => {
    onMonthChange(new Date(year, month - 1, 1))
  }

  const nextMonth = () => {
    onMonthChange(new Date(year, month + 1, 1))
  }

  const goToToday = () => {
    const today = new Date()
    onMonthChange(new Date(today.getFullYear(), today.getMonth(), 1))
    onSelectDate(today)
  }

  // 生成日历格子
  const calendarDays: (number | null)[] = []
  for (let i = 0; i < firstDayWeekday; i++) {
    calendarDays.push(null)
  }
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day)
  }

  const hasEventsOnDay = (day: number) => {
    return events.some(e => {
      const eventDate = new Date(e.date)
      return (
        eventDate.getFullYear() === year &&
        eventDate.getMonth() === month &&
        eventDate.getDate() === day
      )
    })
  }

  const isToday = (day: number) => {
    const today = new Date()
    return (
      today.getFullYear() === year &&
      today.getMonth() === month &&
      today.getDate() === day
    )
  }

  const isSelected = (day: number) => {
    return (
      selectedDate.getFullYear() === year &&
      selectedDate.getMonth() === month &&
      selectedDate.getDate() === day
    )
  }

  return (
    <div className="bg-card rounded-2xl p-4 shadow-sm border border-border">
      {/* 月份导航 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-foreground">
            {year}年{month + 1}月
          </h2>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={prevMonth}
            className="hover:bg-accent"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={goToToday}
            className="text-xs px-2 hover:bg-accent"
          >
            今天
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={nextMonth}
            className="hover:bg-accent"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 星期标题 */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map(day => (
          <div
            key={day}
            className="text-center text-xs font-medium text-muted-foreground py-1"
          >
            {day}
          </div>
        ))}
      </div>

      {/* 日期格子 */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, index) => (
          <button
            key={index}
            onClick={() => day && onSelectDate(new Date(year, month, day))}
            disabled={!day}
            className={cn(
              'relative aspect-square flex flex-col items-center justify-center rounded-lg text-sm transition-all',
              day && 'hover:bg-accent cursor-pointer',
              !day && 'invisible',
              isSelected(day!) && 'bg-primary text-primary-foreground hover:bg-primary/90',
              isToday(day!) && !isSelected(day!) && 'bg-accent font-semibold',
            )}
          >
            {day}
            {day && hasEventsOnDay(day) && !isSelected(day) && (
              <span className="absolute bottom-1 w-1 h-1 rounded-full bg-primary" />
            )}
            {day && hasEventsOnDay(day) && isSelected(day) && (
              <span className="absolute bottom-1 w-1 h-1 rounded-full bg-primary-foreground" />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
