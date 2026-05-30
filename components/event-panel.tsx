'use client'

import { CalendarEvent, ViewMode } from '@/lib/types'
import { EventList } from './event-list'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

interface EventPanelProps {
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  selectedDate: Date
  getEventsForDate: (date: Date) => CalendarEvent[]
  getEventsForMonth: (year: number, month: number) => CalendarEvent[]
  getEventsForYear: (year: number) => CalendarEvent[]
  onDeleteEvent: (eventId: string) => void
}

const monthNames = [
  '一月', '二月', '三月', '四月', '五月', '六月',
  '七月', '八月', '九月', '十月', '十一月', '十二月'
]

export function EventPanel({
  viewMode,
  onViewModeChange,
  selectedDate,
  getEventsForDate,
  getEventsForMonth,
  getEventsForYear,
  onDeleteEvent,
}: EventPanelProps) {
  const formatDateTitle = (date: Date) => {
    const weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
    return `${date.getMonth() + 1}月${date.getDate()}日 ${weekDays[date.getDay()]}`
  }

  const formatMonthTitle = (date: Date) => {
    return `${date.getFullYear()}年${date.getMonth() + 1}月`
  }

  const formatYearTitle = (date: Date) => {
    return `${date.getFullYear()}年`
  }

  const dayEvents = getEventsForDate(selectedDate)
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

  return (
    <div className="flex flex-col h-full bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
      {/* 视图切换标签 */}
      <div className="p-4 border-b border-border">
        <Tabs value={viewMode} onValueChange={(v) => onViewModeChange(v as ViewMode)}>
          <TabsList className="w-full justify-start bg-muted/50">
            <TabsTrigger value="day" className="flex-1">日</TabsTrigger>
            <TabsTrigger value="month" className="flex-1">月</TabsTrigger>
            <TabsTrigger value="year" className="flex-1">年</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* 事件内容区域 */}
      <div className="flex-1 p-4 overflow-hidden">
        {viewMode === 'day' && (
          <EventList
            events={dayEvents}
            onDeleteEvent={onDeleteEvent}
            title={formatDateTitle(selectedDate)}
            emptyMessage="今天没有事件安排"
          />
        )}

        {viewMode === 'month' && (
          <EventList
            events={monthEvents}
            onDeleteEvent={onDeleteEvent}
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
                              className="group flex items-center gap-3 p-3 rounded-lg border border-border bg-background hover:shadow-sm transition-all"
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
