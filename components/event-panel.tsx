'use client'

import { CalendarEvent, ViewMode } from '@/lib/types'
import { EventList } from './event-list'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'

interface EventPanelProps {
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  selectedDate: Date
  getEventsForDate: (date: Date) => CalendarEvent[]
  getEventsForMonth: (year: number, month: number) => CalendarEvent[]
  getEventsForYear: (year: number) => CalendarEvent[]
  onDeleteEvent: (eventId: string) => void
  onEventClick?: (event: CalendarEvent) => void
}

const monthNames = [
  '一月', '二月', '三月', '四月', '五月', '六月',
  '七月', '八月', '九月', '十月', '十一月', '十二月'
]

const weekDayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

function getWeekRange(date: Date): { start: Date; end: Date } {
  const day = date.getDay()
  const start = new Date(date)
  start.setDate(date.getDate() - day) // Sunday
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(start.getDate() + 6) // Saturday
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

export function EventPanel({
  viewMode,
  onViewModeChange,
  selectedDate,
  getEventsForDate,
  getEventsForMonth,
  getEventsForYear,
  onDeleteEvent,
  onEventClick,
}: EventPanelProps) {
  const formatDateTitle = (date: Date) => {
    return `${date.getMonth() + 1}月${date.getDate()}日 ${weekDayNames[date.getDay()]}`
  }

  const formatWeekTitle = (date: Date) => {
    const { start, end } = getWeekRange(date)
    return `${start.getMonth() + 1}月${start.getDate()}日 - ${end.getMonth() + 1}月${end.getDate()}日`
  }

  const formatMonthTitle = (date: Date) => {
    return `${date.getFullYear()}年${date.getMonth() + 1}月`
  }

  const formatYearTitle = (date: Date) => {
    return `${date.getFullYear()}年`
  }

  const dayEvents = getEventsForDate(selectedDate)

  // 周视图事件
  const { start: weekStart, end: weekEnd } = getWeekRange(selectedDate)
  const weekEvents: CalendarEvent[] = []
  for (let d = new Date(weekStart); d <= weekEnd; d.setDate(d.getDate() + 1)) {
    const dayEvents = getEventsForDate(new Date(d))
    weekEvents.push(...dayEvents)
  }

  const monthEvents = getEventsForMonth(selectedDate.getFullYear(), selectedDate.getMonth())
  const yearEvents = getEventsForYear(selectedDate.getFullYear())

  // 年视图按月分组
  const eventsByMonth: Record<number, CalendarEvent[]> = {}
  yearEvents.forEach(event => {
    const month = new Date(event.date).getMonth()
    if (!eventsByMonth[month]) {
      eventsByMonth[month] = []
    }
    eventsByMonth[month].push(event)
  })

  const tabs: { value: ViewMode; label: string }[] = [
    { value: 'day', label: '日' },
    { value: 'week', label: '周' },
    { value: 'month', label: '月' },
    { value: 'year', label: '年' },
  ]

  return (
    <div className="flex flex-col h-full bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
      {/* 视图切换标签 */}
      <div className="p-4 border-b border-border">
        <Tabs value={viewMode} onValueChange={(v) => onViewModeChange(v as ViewMode)}>
          <TabsList className="w-full justify-start bg-muted/50">
            {tabs.map(t => (
              <TabsTrigger key={t.value} value={t.value} className="flex-1">{t.label}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* 事件内容区域 */}
      <div className="flex-1 p-4 overflow-hidden">
        {viewMode === 'day' && (
          <EventList
            events={dayEvents}
            onDeleteEvent={onDeleteEvent}
            onEventClick={onEventClick}
            title={formatDateTitle(selectedDate)}
            emptyMessage="今天没有事件安排"
          />
        )}

        {viewMode === 'week' && (
          <EventList
            events={weekEvents}
            onDeleteEvent={onDeleteEvent}
            onEventClick={onEventClick}
            title={formatWeekTitle(selectedDate)}
            emptyMessage="本周没有事件安排"
          />
        )}

        {viewMode === 'month' && (
          <EventList
            events={monthEvents}
            onDeleteEvent={onDeleteEvent}
            onEventClick={onEventClick}
            title={formatMonthTitle(selectedDate)}
            emptyMessage="本月没有事件安排"
          />
        )}

        {viewMode === 'year' && (
          <div className="flex flex-col h-full">
            <h3 className="text-lg font-semibold text-foreground mb-4 px-1">
              {formatYearTitle(selectedDate)}
            </h3>
            {yearEvents.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-muted-foreground text-sm">今年没有事件安排</p>
              </div>
            ) : (
              <ScrollArea className="flex-1 pr-4">
                <div className="space-y-6">
                  {Object.entries(eventsByMonth)
                    .sort(([a], [b]) => Number(a) - Number(b))
                    .map(([monthIndex, events]) => (
                      <div key={monthIndex}>
                        <h4 className="text-sm font-medium text-muted-foreground mb-3">
                          {monthNames[Number(monthIndex)]}
                        </h4>
                        <div className="space-y-2">
                          {events.map(event => (
                            <div
                              key={event.id}
                              onClick={() => onEventClick?.(event)}
                              className={onEventClick ? 'cursor-pointer group flex items-center gap-3 p-3 rounded-lg border border-border bg-background hover:shadow-sm transition-all' : 'group flex items-center gap-3 p-3 rounded-lg border border-border bg-background hover:shadow-sm transition-all'}
                            >
                              <div
                                className="w-1 h-8 rounded-full shrink-0"
                                style={{ backgroundColor: event.color || '#3b82f6' }}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-foreground truncate text-sm">
                                  {event.title}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(event.date).getDate()}日 · {event.time}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              </ScrollArea>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
