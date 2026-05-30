'use client'

import { useState, useEffect, useCallback } from 'react'
import { MiniCalendar } from '@/components/mini-calendar'
import { EventPanel } from '@/components/event-panel'
import { VoiceControl } from '@/components/voice-control'
import { CommandConfirmation } from '@/components/command-confirmation'
import { useCalendarEvents } from '@/lib/use-calendar-events'
import { useSpeechRecognition, VoiceStatus } from '@/lib/use-speech-recognition'
import { parseCalendarCommandWithDeepSeekFallback } from '@/lib/calendar-command-api'
import { ParsedCalendarCommand, ViewMode } from '@/lib/types'
import { useEventReminderNotifications } from '@/lib/reminder-notifications'
import { CalendarDays } from 'lucide-react'

export function VoiceCalendar() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>('day')
  const [lastAction, setLastAction] = useState<string>('')
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>('idle')
  const [pendingCommand, setPendingCommand] = useState<ParsedCalendarCommand | null>(null)

  const {
    events,
    addEvent,
    deleteEvent,
    deleteEventByTitle,
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
  } = useSpeechRecognition()

  // 同步语音识别状态
  useEffect(() => {
    if (recognitionStatus === 'listening' || recognitionStatus === 'error') {
      setVoiceStatus(recognitionStatus)
    }
  }, [recognitionStatus])

  // 处理语音或文字命令
  const processCommand = useCallback(async (text: string) => {
    if (!text.trim()) {
      setVoiceStatus('error')
      setLastAction('未能识别命令内容')
      return
    }

    setVoiceStatus('processing')
    const command = await parseCalendarCommandWithDeepSeekFallback(text, events)

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
        if (command.title) {
          const deleted = deleteEventByTitle(command.title)
          if (deleted) {
            setVoiceStatus('success')
            setLastAction(`已删除事件：${deleted.title}`)
          } else {
            setVoiceStatus('error')
            setLastAction(`未找到事件：${command.title}`)
          }
        } else {
          setVoiceStatus('error')
          setLastAction('请说明要删除的事件名称')
        }
        break

      case 'query':
        setPendingCommand(null)
        if (command.date) {
          setSelectedDate(command.date)
          setCurrentMonth(new Date(command.date.getFullYear(), command.date.getMonth(), 1))
          setViewMode('day')
          const dayEvents = getEventsForDate(command.date)
          setVoiceStatus('success')
          setLastAction(
            dayEvents.length > 0
              ? `找到 ${dayEvents.length} 个事件`
              : '当天没有安排'
          )
        } else {
          setViewMode('day')
          const todayEvents = getEventsForDate(new Date())
          setVoiceStatus('success')
          setLastAction(
            todayEvents.length > 0
              ? `今天有 ${todayEvents.length} 个事件`
              : '今天没有安排'
          )
        }
        break

      default:
        setPendingCommand(null)
        setVoiceStatus('error')
        setLastAction('无法理解指令，请尝试说：添加/删除/查看')
    }
  }, [deleteEventByTitle, events, getEventsForDate])

  // 监听处理状态变化
  useEffect(() => {
    if (recognitionStatus === 'processing' && transcript) {
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
    setPendingCommand(null)
    setSelectedDate(event.date)
    setCurrentMonth(new Date(event.date.getFullYear(), event.date.getMonth(), 1))
    setViewMode('day')
    setVoiceStatus('success')
    setLastAction(`已添加事件：${newEvent.title}`)
  }

  const handleCancelConfirmation = () => {
    setPendingCommand(null)
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
              onStartListening={startListening}
              onStopListening={stopListening}
              onSubmitText={processCommand}
              lastAction={lastAction}
            />

            {pendingCommand && (
              <CommandConfirmation
                command={pendingCommand}
                onConfirm={handleConfirmEvent}
                onCancel={handleCancelConfirmation}
              />
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
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
