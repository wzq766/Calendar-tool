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
  isSpeaking: boolean
}

const SILENCE_TIMEOUT_MS = 2000    // 连续静音多久自动停止
const SPEECH_THRESHOLD = 0.08      // 音量阈值 (RMS amplitude 0-1)
const MIN_SPEECH_TIME_MS = 500     // 至少说了多久才启用自动停止

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [status, setStatus] = useState<VoiceStatus>('idle')
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSupported, setIsSupported] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const speechStartedRef = useRef(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsSupported(!!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined')
    }
  }, [])

  const cleanupAudioAnalysis = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {})
      audioContextRef.current = null
    }
  }, [])

  const startSilenceDetection = useCallback((stream: MediaStream) => {
    cleanupAudioAnalysis()

    const audioCtx = new AudioContext()
    audioContextRef.current = audioCtx
    const analyser = audioCtx.createAnalyser()
    analyser.fftSize = 512
    analyser.smoothingTimeConstant = 0.3

    const source = audioCtx.createMediaStreamSource(stream)
    source.connect(analyser)

    const dataArray = new Uint8Array(analyser.fftSize)
    let lastSpeechTime = Date.now()
    let speechDetected = false

    const check = () => {
      if (!audioContextRef.current || !mediaRecorderRef.current) return
      if (mediaRecorderRef.current.state !== 'recording') return

      // 用时域数据（波形）计算 RMS 音量
      analyser.getByteTimeDomainData(dataArray)
      let sumSquares = 0
      for (let i = 0; i < dataArray.length; i++) {
        const normalized = (dataArray[i] - 128) / 128 // -1 to 1
        sumSquares += normalized * normalized
      }
      const rms = Math.sqrt(sumSquares / dataArray.length)

      const now = Date.now()

      if (rms > SPEECH_THRESHOLD) {
        lastSpeechTime = now
        if (!speechDetected) {
          speechDetected = true
        }
        setIsSpeaking(true)
      } else {
        setIsSpeaking(false)
      }

      // 说过话 + 静音超过阈值时间 → 自动停止
      if (speechDetected && (now - lastSpeechTime) >= SILENCE_TIMEOUT_MS) {
        if (mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop()
        }
        cleanupAudioAnalysis()
        return
      }

      requestAnimationFrame(check)
    }

    requestAnimationFrame(check)
  }, [cleanupAudioAnalysis])

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
          setIsSpeaking(false)
          cleanupAudioAnalysis()
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
        startSilenceDetection(stream)
      } catch (error) {
        setStatus('error')
        setError(error instanceof DOMException && error.name === 'NotAllowedError'
          ? '麦克风权限被拒绝。请在浏览器地址栏左侧的站点权限中允许麦克风，然后刷新页面重试。'
          : '无法启动麦克风录音，请检查浏览器权限和系统输入设备。')
      }
    }
  }, [isSupported, status, cleanupAudioAnalysis, startSilenceDetection])

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
    isSpeaking,
  }
}
