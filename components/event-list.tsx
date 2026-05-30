'use client'

import { CalendarEvent } from '@/lib/types'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EventListProps {
  events: CalendarEvent[]
  onDeleteEvent: (eventId: string) => void
  title: string
  emptyMessage: string
}

export function EventList({ events, onDeleteEvent, title, emptyMessage }: EventListProps) {
  const formatTime = (time: string, endTime?: string) => {
    if (endTime) {
      return `${time} - ${endTime}`
    }
    return time
  }

  const formatDate = (date: Date) => {
    const d = new Date(date)
    return `${d.getMonth() + 1}月${d.getDate()}日`
  }

  return (
    <div className="flex flex-col h-full">
      <h3 className="text-lg font-semibold text-foreground mb-4 px-1">{title}</h3>

      {events.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground text-sm">{emptyMessage}</p>
        </div>
      ) : (
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-3">
            {events.map(event => (
              <div
                key={event.id}
                className={cn(
                  'group relative p-4 rounded-xl border border-border bg-card',
                  'hover:shadow-md transition-all duration-200',
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-1 h-full min-h-[40px] rounded-full shrink-0"
                    style={{ backgroundColor: event.color || '#3b82f6' }}
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-foreground truncate">{event.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {formatDate(event.date)} · {formatTime(event.time, event.endTime)}
                    </p>
                    {event.description && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                        {event.description}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onDeleteEvent(event.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  )
}
