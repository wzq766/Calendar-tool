import { describe, expect, test } from 'vitest'

import { getSpeechRecognitionErrorMessage } from './speech-recognition-errors'

describe('speech recognition errors', () => {
  test('explains microphone permission denial', () => {
    expect(getSpeechRecognitionErrorMessage('not-allowed')).toContain('麦克风权限')
    expect(getSpeechRecognitionErrorMessage('service-not-allowed')).toContain('语音识别服务')
  })

  test('keeps a helpful fallback for unknown browser error codes', () => {
    expect(getSpeechRecognitionErrorMessage('network')).toContain('浏览器语音识别服务')
    expect(getSpeechRecognitionErrorMessage('network')).toContain('文字输入')
    expect(getSpeechRecognitionErrorMessage('custom-error')).toBe('语音识别错误: custom-error')
  })
})
