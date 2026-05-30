'use client'

import { VoiceStatus } from '@/lib/use-speech-recognition'
import { cn } from '@/lib/utils'
import { Mic, MicOff, Loader2, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useState } from 'react'

interface VoiceControlProps {
  status: VoiceStatus
  transcript: string
  error: string | null
  isSupported: boolean
  onStartListening: () => void
  onStopListening: () => void
  onSubmitText: (text: string) => void
  lastAction?: string
}

const statusConfig: Record<VoiceStatus, { label: string; icon: React.ReactNode; color: string }> = {
  idle: {
    label: '点击开始语音输入',
    icon: <Mic className="h-6 w-6" />,
    color: 'bg-primary hover:bg-primary/90',
  },
  listening: {
    label: '正在聆听...',
    icon: <Mic className="h-6 w-6 animate-pulse" />,
    color: 'bg-red-500 hover:bg-red-600',
  },
  processing: {
    label: '正在处理...',
    icon: <Loader2 className="h-6 w-6 animate-spin" />,
    color: 'bg-amber-500',
  },
  success: {
    label: '操作成功',
    icon: <Check className="h-6 w-6" />,
    color: 'bg-green-500',
  },
  error: {
    label: '识别失败',
    icon: <X className="h-6 w-6" />,
    color: 'bg-destructive',
  },
}

export function VoiceControl({
  status,
  transcript,
  error,
  isSupported,
  onStartListening,
  onStopListening,
  onSubmitText,
  lastAction,
}: VoiceControlProps) {
  const config = statusConfig[status]
  const [manualText, setManualText] = useState('')

  const handleClick = () => {
    if (status === 'listening') {
      onStopListening()
    } else if (status === 'idle' || status === 'success' || status === 'error') {
      onStartListening()
    }
  }

  const handleManualSubmit = () => {
    const text = manualText.trim()
    if (!text) return
    onSubmitText(text)
    setManualText('')
  }

  return (
    <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
      <div className="flex items-start gap-4">
        <Button
          onClick={handleClick}
          disabled={status === 'processing' || !isSupported}
          className={cn(
            'w-14 h-14 rounded-full shrink-0 transition-all duration-300',
            isSupported ? config.color : 'bg-muted text-muted-foreground',
            status === 'listening' && 'ring-4 ring-red-500/30'
          )}
          aria-label={isSupported ? config.label : '语音功能不可用'}
        >
          {isSupported ? config.icon : <MicOff className="h-6 w-6" />}
        </Button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-foreground">
              {isSupported ? config.label : '语音功能不可用'}
            </h3>
            {status === 'listening' && (
              <span className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-red-500 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </span>
            )}
          </div>

          {transcript && (
            <p className="text-sm text-foreground mt-2 p-3 bg-muted rounded-lg">
              &quot;{transcript}&quot;
            </p>
          )}

          {error && (
            <p className="text-sm text-destructive mt-2">{error}</p>
          )}

          {lastAction && status === 'success' && (
            <p className="text-sm text-green-600 mt-2">{lastAction}</p>
          )}

          {status === 'idle' && !transcript && (
            <p className="text-sm text-muted-foreground mt-1">
              {isSupported
                ? '试试说："添加明天下午3点开会" 或 "查看今天的安排"'
                : '当前浏览器不支持语音识别，可使用下方文字输入继续演示。'}
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <Input
          value={manualText}
          placeholder="输入：添加明天下午3点开会"
          onChange={(event) => setManualText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              handleManualSubmit()
            }
          }}
        />
        <Button type="button" onClick={handleManualSubmit} disabled={!manualText.trim()}>
          解析
        </Button>
      </div>

      {/* 语音提示 */}
      <div className="mt-4 pt-4 border-t border-border">
        <p className="text-xs text-muted-foreground mb-2">支持的语音指令：</p>
        <div className="flex flex-wrap gap-2">
          {[
            '添加 [事件] 在 [时间]',
            '删除 [事件名称]',
            '查看今天的安排',
          ].map(cmd => (
            <span
              key={cmd}
              className="text-xs px-2 py-1 bg-muted rounded-md text-muted-foreground"
            >
              {cmd}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
