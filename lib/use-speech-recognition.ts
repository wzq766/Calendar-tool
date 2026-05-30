'use client'

import { useState, useCallback, useRef, useEffect } from 'react'

export type VoiceStatus = 'idle' | 'listening' | 'processing' | 'success' | 'error'

interface UseSpeechRecognitionReturn {
  status: VoiceStatus
  transcript: string
  error: string | null
  startListening: () => void
  stopListening: () => void
  isSupported: boolean
}

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [status, setStatus] = useState<VoiceStatus>('idle')
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSupported, setIsSupported] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsSupported(!!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined')
    }
  }, [])

  const startListening = useCallback(async () => {
    if (!isSupported) {
      setStatus('error')
      setError('当前浏览器不支持录音上传，请使用 Chrome 或 Edge，或直接使用文字输入。')
      return
    }

    if (status !== 'listening') {
      setTranscript('')
      setError(null)
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const recorder = new MediaRecorder(stream)
        streamRef.current = stream
        mediaRecorderRef.current = recorder
        audioChunksRef.current = []

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data)
          }
        }

        recorder.onstop = async () => {
          setStatus('processing')
          stream.getTracks().forEach((track) => track.stop())
          streamRef.current = null

          try {
            const audio = new Blob(audioChunksRef.current, {
              type: recorder.mimeType || 'audio/webm',
            })
            const formData = new FormData()
            formData.set('audio', audio, 'speech.webm')

            const response = await fetch('/api/transcribe', {
              method: 'POST',
              body: formData,
            })

            if (!response.ok) {
              const result = await response.json().catch(() => null) as { message?: string } | null

              throw new Error(response.status === 503
                ? '未配置 ASR_API_KEY 或 OPENAI_API_KEY，无法使用大模型语音转文字。'
                : result?.message || '大模型语音转文字失败，请重试或使用文字输入。')
            }

            const result = await response.json() as { text?: string }
            if (!result.text?.trim()) {
              throw new Error('没有识别到语音内容，请重试。')
            }

            setTranscript(result.text.trim())
            setStatus('processing')
          } catch (error) {
            setStatus('error')
            setError(error instanceof Error ? error.message : '大模型语音转文字失败，请重试。')
          }
        }

        recorder.start()
        setStatus('listening')
      } catch (error) {
        setStatus('error')
        setError(error instanceof DOMException && error.name === 'NotAllowedError'
          ? '麦克风权限被拒绝。请在浏览器地址栏左侧的站点权限中允许麦克风，然后刷新页面重试。'
          : '无法启动麦克风录音，请检查浏览器权限和系统输入设备。')
      }
    }
  }, [isSupported, status])

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && status === 'listening') {
      mediaRecorderRef.current.stop()
    }
  }, [status])

  return {
    status,
    transcript,
    error,
    startListening,
    stopListening,
    isSupported,
  }
}
