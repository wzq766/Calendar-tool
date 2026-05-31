'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { MiniCalendar } from '@/components/mini-calendar'
import { EventPanel } from '@/components/event-panel'
import { VoiceControl } from '@/components/voice-control'
import { CommandConfirmation } from '@/components/command-confirmation'
import { EventDetailDialog } from '@/components/event-detail-dialog'
import { useCalendarEvents } from '@/lib/use-calendar-events'
import { useSpeechRecognition, VoiceStatus } from '@/lib/use-speech-recognition'
import {
  parseCalendarCommandWithDeepSeekFallback,
  parseCalendarCommandsWithDeepSeekFallback,
} from '@/lib/calendar-command-api'
import { CalendarEvent, ParsedCalendarCommand, ViewMode } from '@/lib/types'
import { useEventReminderNotifications } from '@/lib/reminder-notifications'
import { CalendarDays } from 'lucide-react'

export function VoiceCalendar() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>('day')
  const [lastAction, setLastAction] = useState<string>('')
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>('idle')
  const [pendingCommand, setPendingCommand] = useState<ParsedCalendarCommand | null>(null)
  const lastProcessedTranscript = useRef<string>('')
  const pendingAddQueue = useRef<ParsedCalendarCommand[]>([])
  const [candidates, setCandidates] = useState<CalendarEvent[]>([])
  const candidateAction = useRef<'delete' | 'edit'>('delete')
  const candidateEditData = useRef<ParsedCalendarCommand | null>(null)
  const [detailEvent, setDetailEvent] = useState<CalendarEvent | null>(null)

  const {
    events,
    addEvent,
    deleteEvent,
    deleteEventByTitle,
    updateEvent,
    getEventsForDate,
    getEventsForMonth,
    getEventsForYear,
  } = useCalendarEvents()

  useEventReminderNotifications(events)

  const {
    status: recognitionStatus,
    transcript,
    error,
    startListening,
    stopListening,
    isSupported,
    isSpeaking,
  } = useSpeechRecognition()

  // 同步语音识别状态（不覆盖命令处理的 success 结果）
  useEffect(() => {
    if (recognitionStatus === 'listening') {
      setVoiceStatus('listening')
      lastProcessedTranscript.current = ''
    } else if (recognitionStatus === 'error') {
      // 只在非 success 状态下才允许 ASR 错误覆盖
      setVoiceStatus(prev => (prev === 'success' ? prev : 'error'))
    }
  }, [recognitionStatus])

  // 操作成功后 3 秒自动回到 idle
  useEffect(() => {
    if (voiceStatus !== 'success') return
    const timer = setTimeout(() => setVoiceStatus('idle'), 3000)
    return () => clearTimeout(timer)
  }, [voiceStatus])

  // 处理语音或文字命令（支持多事件）
  const processCommand = useCallback(async (text: string) => {
    if (!text.trim()) {
      setVoiceStatus('error')
      setLastAction('未能识别命令内容')
      return
    }

    setVoiceStatus('processing')
    const commands = await parseCalendarCommandsWithDeepSeekFallback(text, events)
    if (commands.length === 0) {
      setVoiceStatus('error')
      setLastAction('无法理解指令，请尝试说：添加/删除/查看')
      return
    }

    // 取第一个命令，其余的入队
    const command = commands[0]
    pendingAddQueue.current = commands.slice(1).filter(c => c.action === 'add')

    switch (command.action) {
      case 'add':
        if (command.title && command.date) {
          setPendingCommand(command)
          setVoiceStatus('success')
          setLastAction('已解析日程信息，请确认后创建')
        } else {
          setPendingCommand(null)
          setVoiceStatus('error')
          setLastAction('无法识别事件信息，请重试')
        }
        break

      case 'delete':
        setPendingCommand(null)
        setCandidates([])
        if (command.title) {
          // 优先在同一天匹配，避免跨天误删
          const candidates = command.date
            ? events.filter(e => {
                const ed = new Date(e.date)
                const cd = command.date!
                return ed.getFullYear() === cd.getFullYear() &&
                  ed.getMonth() === cd.getMonth() &&
                  ed.getDate() === cd.getDate()
              })
            : events

          const matched = candidates.find(e =>
            e.title.toLowerCase().includes(command.title!.toLowerCase()) ||
            command.title!.toLowerCase().includes(e.title.toLowerCase())
          )

          if (matched) {
            deleteEvent(matched.id)
            setVoiceStatus('success')
            setLastAction(`已删除事件：${matched.title}`)
          } else {
            // 当天没找到，扩大到全部事件找候选项
            const fuzzyMatches = events.filter(e =>
              e.title.toLowerCase().includes(command.title!.toLowerCase()) ||
              command.title!.toLowerCase().includes(e.title.toLowerCase())
            )
            if (fuzzyMatches.length > 0) {
              setCandidates(fuzzyMatches)
              candidateAction.current = 'delete'
              candidateEditData.current = null
              setVoiceStatus('error')
              setLastAction(`"${command.title}"匹配到 ${fuzzyMatches.length} 个事件，请点击要删除的：`)
            } else {
              setVoiceStatus('error')
              setLastAction(`未找到名为"${command.title}"的事件`)
            }
          }
        } else if (command.date) {
          // 没匹配到标题但有日期，列出当天事件供参考
          const dayEvents = getEventsForDate(command.date)
          if (dayEvents.length > 0) {
            const titles = dayEvents.map(e => `"${e.title}"(${e.time})`).join('、')
            setVoiceStatus('error')
            setLastAction(`未找到匹配事件，当天有：${titles}`)
          } else {
            setVoiceStatus('error')
            setLastAction('该时段没有可删除的事件')
          }
        } else {
          setVoiceStatus('error')
          setLastAction('请说出要删除的事件名称或时间')
        }
        break

      case 'query':
        setPendingCommand(null)
        {
          const scope = command.viewScope || 'day'
          const targetDate = command.date || new Date()
          setSelectedDate(targetDate)
          setCurrentMonth(new Date(targetDate.getFullYear(), targetDate.getMonth(), 1))
          setViewMode(scope)

          // 按关键词过滤
          let relevantEvents: CalendarEvent[] = []
          if (scope === 'year') {
            relevantEvents = getEventsForYear(targetDate.getFullYear())
          } else if (scope === 'month') {
            relevantEvents = getEventsForMonth(targetDate.getFullYear(), targetDate.getMonth())
          } else if (scope === 'week') {
            const day = targetDate.getDay()
            const ws = new Date(targetDate)
            ws.setDate(targetDate.getDate() - day)
            for (let i = 0; i < 7; i++) {
              const d = new Date(ws)
              d.setDate(ws.getDate() + i)
              relevantEvents.push(...getEventsForDate(d))
            }
          } else {
            relevantEvents = getEventsForDate(targetDate)
          }

          if (command.keyword) {
            const kw = command.keyword.toLowerCase()
            relevantEvents = relevantEvents.filter(e =>
              e.title.toLowerCase().includes(kw) ||
              (e.description && e.description.toLowerCase().includes(kw))
            )
          }

          const count = relevantEvents.length
          const scopeLabel = scope === 'day' ? '当天' : scope === 'week' ? '本周' : scope === 'month' ? '本月' : '今年'
          const kwLabel = command.keyword ? `"${command.keyword}"相关` : ''
          setVoiceStatus('success')
          setLastAction(count > 0 ? `${scopeLabel}${kwLabel}有 ${count} 个事件` : `${scopeLabel}${kwLabel}没有安排`)
        }
        break

      case 'edit':
        setPendingCommand(null)
        if (command.title) {
          // 优先同一天匹配
          const editCandidates = command.date
            ? events.filter(e => {
                const ed = new Date(e.date)
                const cd = command.date!
                return ed.getFullYear() === cd.getFullYear() &&
                  ed.getMonth() === cd.getMonth() &&
                  ed.getDate() === cd.getDate()
              })
            : events

          const matched = command.matchedEventId
            ? editCandidates.find(e => e.id === command.matchedEventId)
            : editCandidates.find(e =>
                e.title.toLowerCase().includes(command.title!.toLowerCase()) ||
                command.title!.toLowerCase().includes(e.title.toLowerCase())
              )
          if (matched) {
            const updatedTitle = command.newTitle || matched.title
            const updatedDate = command.newDate || matched.date
            const updatedTime = command.newTime || matched.time
            const updatedEndTime = command.newEndTime || matched.endTime || (
              matched.endTime && command.newTime ? matched.endTime : matched.endTime
            )

            updateEvent(matched.id, {
              title: updatedTitle,
              date: updatedDate,
              time: updatedTime,
              endTime: updatedEndTime,
            })
            setSelectedDate(updatedDate)
            setCurrentMonth(new Date(updatedDate.getFullYear(), updatedDate.getMonth(), 1))
            setViewMode('day')
            setVoiceStatus('success')
            setLastAction(`已更新：${matched.title} → ${updatedTitle} ${updatedTime}`)
          } else {
            const fuzzyMatches = events.filter(e =>
              e.title.toLowerCase().includes(command.title!.toLowerCase()) ||
              command.title!.toLowerCase().includes(e.title.toLowerCase())
            )
            if (fuzzyMatches.length > 0) {
              setCandidates(fuzzyMatches)
              candidateAction.current = 'edit'
              candidateEditData.current = command
              setVoiceStatus('error')
              setLastAction(`"${command.title}"匹配到 ${fuzzyMatches.length} 个事件，请点击要修改的：`)
            } else {
              setVoiceStatus('error')
              setLastAction(`未找到要修改的事件：${command.title}`)
            }
          }
        } else {
          setVoiceStatus('error')
          setLastAction('请说明要修改哪个事件，例如"把明天会议改到下午3点"')
        }
        break

      default:
        setPendingCommand(null)
        setVoiceStatus('error')
        setLastAction('无法理解指令，请尝试说：添加/删除/查看')
    }
  }, [deleteEventByTitle, events, getEventsForDate, updateEvent])

  // 监听处理状态变化，同一段 transcript 不重复处理
  useEffect(() => {
    if (recognitionStatus === 'processing' && transcript && transcript !== lastProcessedTranscript.current) {
      lastProcessedTranscript.current = transcript
      processCommand(transcript)
    }
  }, [recognitionStatus, transcript, processCommand])

  const handleConfirmEvent = async (event: {
    title: string
    date: Date
    time: string
    endTime?: string
    remindBeforeMinutes?: number
  }) => {
    if (
      event.remindBeforeMinutes !== undefined &&
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'default'
    ) {
      await Notification.requestPermission()
    }

    const newEvent = addEvent(event)
    setSelectedDate(event.date)
    setCurrentMonth(new Date(event.date.getFullYear(), event.date.getMonth(), 1))
    setViewMode('day')

    // 队列中还有待确认事件则出队下一个
    const next = pendingAddQueue.current.shift()
    if (next) {
      setPendingCommand(next)
      const remaining = pendingAddQueue.current.length
      setVoiceStatus('success')
      setLastAction(`已添加：${newEvent.title}${remaining > 0 ? `（还有 ${remaining + 1} 个待确认）` : '（还有 1 个待确认）'}`)
    } else {
      setPendingCommand(null)
      setVoiceStatus('success')
      setLastAction(`已添加事件：${newEvent.title}`)
    }
  }

  const handleCancelConfirmation = () => {
    setPendingCommand(null)
    // 取消当前也清空队列
    pendingAddQueue.current = []
    setVoiceStatus('idle')
    setLastAction('已取消创建日程')
  }

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date)
    setViewMode('day')
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部标题栏 */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <CalendarDays className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">语音日历</h1>
              <p className="text-sm text-muted-foreground">用语音管理您的日程安排</p>
            </div>
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* 左侧：迷你日历 + 语音控制 */}
          <div className="lg:col-span-4 space-y-6">
            <MiniCalendar
              selectedDate={selectedDate}
              onSelectDate={handleDateSelect}
              events={events}
              currentMonth={currentMonth}
              onMonthChange={setCurrentMonth}
            />

            <VoiceControl
              status={voiceStatus}
              transcript={transcript}
              error={error}
              isSupported={isSupported}
              isSpeaking={isSpeaking}
              onStartListening={startListening}
              onStopListening={stopListening}
              onSubmitText={processCommand}
              lastAction={lastAction}
            />

            {pendingCommand && (
              <CommandConfirmation
                command={pendingCommand}
                existingEvents={events}
                onConfirm={handleConfirmEvent}
                onCancel={handleCancelConfirmation}
              />
            )}

            {candidates.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-2">
                <h3 className="font-semibold text-foreground text-sm">
                  {candidateAction.current === 'delete' ? '请选择要删除的事件' : '请选择要修改的事件'}
                </h3>
                {candidates.map(event => (
                  <button
                    key={event.id}
                    onClick={() => {
                      if (candidateAction.current === 'delete') {
                        deleteEvent(event.id)
                        setCandidates([])
                        setVoiceStatus('success')
                        setLastAction(`已删除事件：${event.title}`)
                      } else {
                        const cmd = candidateEditData.current!
                        const updatedTitle = cmd.newTitle || event.title
                        const updatedDate = cmd.newDate || event.date
                        const updatedTime = cmd.newTime || event.time
                        const updatedEndTime = cmd.newEndTime || event.endTime
                        updateEvent(event.id, {
                          title: updatedTitle,
                          date: updatedDate,
                          time: updatedTime,
                          endTime: updatedEndTime,
                        })
                        setCandidates([])
                        setSelectedDate(updatedDate)
                        setCurrentMonth(new Date(updatedDate.getFullYear(), updatedDate.getMonth(), 1))
                        setViewMode('day')
                        setVoiceStatus('success')
                        setLastAction(`已更新：${event.title} → ${updatedTitle} ${updatedTime}`)
                      }
                    }}
                    className="w-full text-left flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent transition-colors"
                  >
                    <div className="w-1 h-8 rounded-full shrink-0" style={{ backgroundColor: event.color || '#3b82f6' }} />
                    <div className="min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">{event.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(event.date).getMonth() + 1}月{new Date(event.date).getDate()}日 · {event.time}{event.endTime ? ' - ' + event.endTime : ''}
                      </p>
                    </div>
                  </button>
                ))}
                <button
                  onClick={() => setCandidates([])}
                  className="w-full text-xs text-muted-foreground hover:text-foreground py-1"
                >
                  取消
                </button>
              </div>
            )}
          </div>

          {/* 右侧：事件面板 */}
          <div className="lg:col-span-8">
            <div className="h-[calc(100vh-180px)] min-h-[500px]">
              <EventPanel
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                selectedDate={selectedDate}
                getEventsForDate={getEventsForDate}
                getEventsForMonth={getEventsForMonth}
                getEventsForYear={getEventsForYear}
                onDeleteEvent={deleteEvent}
                onEventClick={setDetailEvent}
              />
            </div>
          </div>
        </div>
      </main>

      <EventDetailDialog
        event={detailEvent}
        open={detailEvent !== null}
        onOpenChange={(open) => { if (!open) setDetailEvent(null) }}
        onSave={updateEvent}
        onDelete={(id) => { deleteEvent(id); setDetailEvent(null) }}
      />
    </div>
  )
}
