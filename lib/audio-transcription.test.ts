import { describe, expect, test } from 'vitest'

import {
  buildTranscriptionFormData,
  getTranscriptionConfig,
  parseTranscriptionResponse,
} from './audio-transcription'

describe('audio transcription', () => {
  test('uses OpenAI-compatible defaults with configurable overrides', () => {
    const config = getTranscriptionConfig({
      OPENAI_API_KEY: 'openai-key',
      ASR_BASE_URL: 'https://asr.example.com/v1',
      ASR_MODEL: 'custom-transcribe',
    })

    expect(config).toEqual({
      apiKey: 'openai-key',
      baseUrl: 'https://asr.example.com/v1',
      model: 'custom-transcribe',
    })
  })

  test('prefers ASR_API_KEY over OPENAI_API_KEY', () => {
    const config = getTranscriptionConfig({
      ASR_API_KEY: 'asr-key',
      OPENAI_API_KEY: 'openai-key',
    })

    expect(config.apiKey).toBe('asr-key')
    expect(config.baseUrl).toBe('https://api.openai.com/v1')
    expect(config.model).toBe('gpt-4o-mini-transcribe')
  })

  test('parses transcription response text', () => {
    expect(parseTranscriptionResponse({ text: '明天下午三点开会' })).toBe('明天下午三点开会')
    expect(parseTranscriptionResponse({ text: '   ' })).toBeNull()
    expect(parseTranscriptionResponse({})).toBeNull()
  })

  test('builds multipart form data for an audio blob', async () => {
    const audio = new Blob(['audio-bytes'], { type: 'audio/webm' })
    const formData = buildTranscriptionFormData(audio, 'speech.webm', 'gpt-4o-mini-transcribe')

    expect(formData.get('model')).toBe('gpt-4o-mini-transcribe')
    expect(formData.get('language')).toBe('zh')
    expect(formData.get('file')).toBeInstanceOf(File)
  })
})
