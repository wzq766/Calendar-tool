'use client'

import { useState, useEffect } from 'react'
import { CalendarEvent } from '@/lib/types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Trash2 } from 'lucide-react'

interface EventDetailDialogProps {
  event: CalendarEvent | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (eventId: string, updates: Partial<Omit<CalendarEvent, 'id'>>) => void
  onDelete: (eventId: string) => void
}

function toDateValue(date: Date): string {
  return [
    date.getFullYear(),
    (date.getMonth() + 1).toString().padStart(2, '0'),
    date.getDate().toString().padStart(2, '0'),
  ].join('-')
}

export function EventDetailDialog({ event, open, onOpenChange, onSave, onDelete }: EventDetailDialogProps) {
  const [title, setTitle] = useState('')
  const [dateValue, setDateValue] = useState('')
  const [time, setTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [description, setDescription] = useState('')
  const [reminder, setReminder] = useState('none')

  useEffect(() => {
    if (!event) return
    setTitle(event.title)
    setDateValue(toDateValue(event.date))
    setTime(event.time)
    setEndTime(event.endTime || '')
    setDescription(event.description || '')
    setReminder(event.remindBeforeMinutes === undefined ? 'none' : event.remindBeforeMinutes.toString())
  }, [event])

  if (!event) return null

  const hasChanges =
    title !== event.title ||
    dateValue !== toDateValue(event.date) ||
    time !== event.time ||
    endTime !== (event.endTime || '') ||
    description !== (event.description || '') ||
    reminder !== (event.remindBeforeMinutes === undefined ? 'none' : event.remindBeforeMinutes.toString())

  const handleSave = () => {
    if (!title.trim() || !dateValue || !time) return
    const [y, m, d] = dateValue.split('-').map(Number)
    onSave(event.id, {
      title: title.trim(),
      date: new Date(y, m - 1, d),
      time,
      endTime: endTime || undefined,
      description: description.trim() || undefined,
      remindBeforeMinutes: reminder === 'none' ? undefined : Number(reminder),
    })
    onOpenChange(false)
  }

  const handleDelete = () => {
    onDelete(event.id)
    onOpenChange(false)
  }

  const formatDate = (d: Date) =>
    `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${['日','一','二','三','四','五','六'][d.getDay()]}`
  const formatTime = (t: string, e?: string) => e ? `${t} - ${e}` : t

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>事件详情</DialogTitle>
          <DialogDescription>
            {formatDate(event.date)} · {formatTime(event.time, event.endTime)}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium text-foreground">标题</span>
            <Input value={title} onChange={e => setTitle(e.target.value)} />
          </label>

          <div className="grid grid-cols-3 gap-3">
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium text-foreground">日期</span>
              <Input type="date" value={dateValue} onChange={e => setDateValue(e.target.value)} />
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium text-foreground">开始</span>
              <Input type="time" value={time} onChange={e => setTime(e.target.value)} />
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium text-foreground">结束</span>
              <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
            </label>
          </div>

          <label className="grid gap-1.5 text-sm">
            <span className="font-medium text-foreground">备注</span>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="添加备注..." />
          </label>

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

        <div className="flex justify-between mt-2">
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-1" />删除
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>取消</Button>
            <Button size="sm" onClick={handleSave} disabled={!hasChanges || !title.trim()}>保存</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
