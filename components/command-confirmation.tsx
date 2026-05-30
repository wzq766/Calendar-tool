'use client'

import { useEffect, useMemo, useState } from 'react'
import { CalendarCheck, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ParsedCalendarCommand } from '@/lib/types'

interface CommandConfirmationProps {
  command: ParsedCalendarCommand
  onConfirm: (event: {
    title: string
    date: Date
    time: string
    endTime?: string
    remindBeforeMinutes?: number
  }) => void
  onCancel: () => void
}

function toDateInputValue(date: Date | undefined): string {
  const value = date || new Date()
  return [
    value.getFullYear(),
    (value.getMonth() + 1).toString().padStart(2, '0'),
    value.getDate().toString().padStart(2, '0'),
  ].join('-')
}

function toDateFromInput(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function addOneHour(time: string): string {
  const [hour, minute] = time.split(':').map(Number)
  return `${((hour + 1) % 24).toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
}

export function CommandConfirmation({ command, onConfirm, onCancel }: CommandConfirmationProps) {
  const initialTime = command.time || '09:00'
  const [title, setTitle] = useState(command.title || '新事件')
  const [dateValue, setDateValue] = useState(toDateInputValue(command.date))
  const [time, setTime] = useState(initialTime)
  const [endTime, setEndTime] = useState(command.endTime || addOneHour(initialTime))
  const [reminder, setReminder] = useState(
    command.remindBeforeMinutes === undefined ? 'none' : command.remindBeforeMinutes.toString()
  )

  useEffect(() => {
    const nextTime = command.time || '09:00'
    setTitle(command.title || '新事件')
    setDateValue(toDateInputValue(command.date))
    setTime(nextTime)
    setEndTime(command.endTime || addOneHour(nextTime))
    setReminder(
      command.remindBeforeMinutes === undefined ? 'none' : command.remindBeforeMinutes.toString()
    )
  }, [command])

  const canConfirm = useMemo(() => title.trim() && dateValue && time, [dateValue, time, title])

  if (command.action !== 'add') {
    return null
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <CalendarCheck className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-foreground">确认创建日程</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                识别为新增事件，请确认关键信息后创建。
              </p>
            </div>
            <Button variant="ghost" size="icon-sm" onClick={onCancel} aria-label="取消确认">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-sm text-foreground">
            &quot;{command.originalText}&quot;
          </p>

          <div className="mt-4 grid gap-3">
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium text-foreground">标题</span>
              <Input value={title} onChange={(event) => setTitle(event.target.value)} />
            </label>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium text-foreground">日期</span>
                <Input
                  type="date"
                  value={dateValue}
                  onChange={(event) => setDateValue(event.target.value)}
                />
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium text-foreground">开始</span>
                <Input type="time" value={time} onChange={(event) => setTime(event.target.value)} />
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium text-foreground">结束</span>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(event) => setEndTime(event.target.value)}
                />
              </label>
            </div>

            <label className="grid gap-1.5 text-sm">
              <span className="font-medium text-foreground">提醒</span>
              <Select value={reminder} onValueChange={setReminder}>
                <SelectTrigger>
                  <SelectValue placeholder="选择提醒时间" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">不提醒</SelectItem>
                  <SelectItem value="0">准时提醒</SelectItem>
                  <SelectItem value="5">提前 5 分钟</SelectItem>
                  <SelectItem value="10">提前 10 分钟</SelectItem>
                  <SelectItem value="30">提前 30 分钟</SelectItem>
                  <SelectItem value="60">提前 1 小时</SelectItem>
                </SelectContent>
              </Select>
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              disabled={!canConfirm}
              onClick={() => {
                onConfirm({
                  title: title.trim(),
                  date: toDateFromInput(dateValue),
                  time,
                  endTime,
                  remindBeforeMinutes: reminder === 'none' ? undefined : Number(reminder),
                })
              }}
            >
              确认创建
            </Button>
            <Button variant="outline" onClick={onCancel}>
              取消
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
