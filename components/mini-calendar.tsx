'use client'

import { useState } from 'react'
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

const monthLabels = [
  '1月', '2月', '3月', '4月', '5月', '6月',
  '7月', '8月', '9月', '10月', '11月', '12月',
]

export function MiniCalendar({
  selectedDate,
  onSelectDate,
  events,
  currentMonth,
  onMonthChange,
}: MiniCalendarProps) {
  const [isYearView, setIsYearView] = useState(false)

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

  const prevYear = () => {
    onMonthChange(new Date(year - 1, month, 1))
  }

  const nextYear = () => {
    onMonthChange(new Date(year + 1, month, 1))
  }

  const goToToday = () => {
    const today = new Date()
    onMonthChange(new Date(today.getFullYear(), today.getMonth(), 1))
    onSelectDate(today)
    setIsYearView(false)
  }

  const selectMonth = (monthIndex: number) => {
    onMonthChange(new Date(year, monthIndex, 1))
    setIsYearView(false)
  }

  // 月视图 —— 生成日历格子
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

  const hasEventsOnMonth = (monthIndex: number) => {
    return events.some(e => {
      const eventDate = new Date(e.date)
      return eventDate.getFullYear() === year && eventDate.getMonth() === monthIndex
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

  const isCurrentMonth = (monthIndex: number) => {
    const today = new Date()
    return today.getFullYear() === year && today.getMonth() === monthIndex
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
      {/* 导航栏 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {isYearView ? (
            <button
              onClick={() => setIsYearView(false)}
              className="text-lg font-semibold text-foreground hover:text-primary transition-colors cursor-pointer rounded-md px-1 -ml-1"
            >
              ← {year}年
            </button>
          ) : (
            <button
              onClick={() => setIsYearView(true)}
              className="text-lg font-semibold text-foreground hover:text-primary transition-colors cursor-pointer rounded-md px-1 -ml-1"
            >
              {year}年{month + 1}月
            </button>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={isYearView ? prevYear : prevMonth}
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
            onClick={isYearView ? nextYear : nextMonth}
            className="hover:bg-accent"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isYearView ? (
        /* 年视图：4×3 月份网格 */
        <div className="grid grid-cols-4 gap-2">
          {monthLabels.map((label, index) => (
            <button
              key={index}
              onClick={() => selectMonth(index)}
              className={cn(
                'relative flex flex-col items-center justify-center rounded-xl py-3 text-sm transition-all',
                'hover:bg-accent cursor-pointer',
                month === index && 'bg-primary/10 text-primary font-semibold',
                isCurrentMonth(index) && !(month === index) && 'bg-accent font-medium',
              )}
            >
              <span>{label}</span>
              {hasEventsOnMonth(index) && (
                <span className={cn(
                  'mt-1 w-1.5 h-1.5 rounded-full',
                  month === index ? 'bg-primary' : 'bg-muted-foreground/40',
                )} />
              )}
            </button>
          ))}
        </div>
      ) : (
        <>
          {/* 星期标题 */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map((day, i) => (
              <div
                key={day}
                className={cn(
                  'text-center text-xs font-medium py-1',
                  (i === 0 || i === 6) ? 'text-red-500' : 'text-muted-foreground',
                )}
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
                  day && !isSelected(day!) && (index % 7 === 0 || index % 7 === 6) && 'text-red-500',
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
        </>
      )}
    </div>
  )
}
