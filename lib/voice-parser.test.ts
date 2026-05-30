import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { parseVoiceCommand } from './voice-parser'

function localDateKey(date: Date | undefined): string | undefined {
  if (!date) return undefined
  return [
    date.getFullYear(),
    (date.getMonth() + 1).toString().padStart(2, '0'),
    date.getDate().toString().padStart(2, '0'),
  ].join('-')
}

describe('parseVoiceCommand', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-30T09:00:00+08:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('parses a natural add command into tomorrow afternoon event fields', () => {
    const command = parseVoiceCommand('添加明天下午3点开会', [])

    expect(command).toMatchObject({
      action: 'add',
      title: '开会',
      time: '15:00',
    })
    expect(localDateKey(command.date)).toBe('2026-05-31')
  })

  test('parses Chinese numerals and half-hour expressions', () => {
    const command = parseVoiceCommand('后天下午两点半开项目会', [])

    expect(command).toMatchObject({
      action: 'add',
      title: '开项目会',
      time: '14:30',
    })
    expect(localDateKey(command.date)).toBe('2026-06-01')
  })

  test('parses explicit month and reminder phrasing', () => {
    const command = parseVoiceCommand('5月31号晚上8点提醒我交材料', [])

    expect(command).toMatchObject({
      action: 'add',
      title: '交材料',
      time: '20:00',
    })
    expect(localDateKey(command.date)).toBe('2026-05-31')
  })
})
