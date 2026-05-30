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
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      setIsSupported(!!SpeechRecognition)

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition()
        recognition.continuous = false
        recognition.interimResults = true
        recognition.lang = 'zh-CN'

        recognition.onstart = () => {
          setStatus('listening')
          setError(null)
        }

        recognition.onresult = (event) => {
          const current = event.resultIndex
          const result = event.results[current]
          const transcriptText = result[0].transcript
          setTranscript(transcriptText)

          if (result.isFinal) {
            setStatus('processing')
          }
        }

        recognition.onerror = (event) => {
          setStatus('error')
          setError(event.error === 'no-speech' ? '未检测到语音，请重试' : `语音识别错误: ${event.error}`)
        }

        recognition.onend = () => {
          if (status === 'listening') {
            setStatus('idle')
          }
        }

        recognitionRef.current = recognition
      }
    }
  }, [])

  const startListening = useCallback(() => {
    if (recognitionRef.current && status !== 'listening') {
      setTranscript('')
      setError(null)
      try {
        recognitionRef.current.start()
      } catch (e) {
        console.error('Speech recognition error:', e)
      }
    }
  }, [status])

  const stopListening = useCallback(() => {
    if (recognitionRef.current && status === 'listening') {
      recognitionRef.current.stop()
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
