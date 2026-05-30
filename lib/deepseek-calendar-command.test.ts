import { describe, expect, test } from 'vitest'

import {
  buildDeepSeekCalendarMessages,
  parseDeepSeekCalendarContent,
  toParsedCalendarCommand,
} from './deepseek-calendar-command'

describe('deepseek calendar command parsing', () => {
  test('parses strict JSON content into a calendar command dto', () => {
    const command = parseDeepSeekCalendarContent(JSON.stringify({
      action: 'add',
      title: '项目会',
      date: '2026-05-31',
      time: '15:00',
      endTime: '16:00',
      remindBeforeMinutes: 30,
      confidence: 0.96,
    }))

    expect(command).toEqual({
      action: 'add',
      title: '项目会',
      date: '2026-05-31',
      time: '15:00',
      endTime: '16:00',
      remindBeforeMinutes: 30,
      confidence: 0.96,
    })
  })

  test('extracts JSON from fenced model output', () => {
    const command = parseDeepSeekCalendarContent('```json\n{"action":"query","date":"2026-06-01"}\n```')

    expect(command).toEqual({
      action: 'query',
      date: '2026-06-01',
    })
  })

  test('converts valid dto dates into local Date instances', () => {
    const command = toParsedCalendarCommand({
      action: 'add',
      title: '项目会',
      date: '2026-05-31',
      time: '15:00',
      remindBeforeMinutes: 30,
    }, '明天下午3点项目会提前30分钟提醒')

    expect(command.action).toBe('add')
    expect(command.title).toBe('项目会')
    expect(command.date).toBeInstanceOf(Date)
    expect(command.date?.getFullYear()).toBe(2026)
    expect(command.date?.getMonth()).toBe(4)
    expect(command.date?.getDate()).toBe(31)
    expect(command.time).toBe('15:00')
    expect(command.remindBeforeMinutes).toBe(30)
  })

  test('builds a prompt that asks for JSON only with the reference date', () => {
    const messages = buildDeepSeekCalendarMessages({
      text: '明天下午3点项目会',
      referenceDate: '2026-05-30',
      existingEvents: [{ id: '1', title: '团队周会', date: '2026-05-30', time: '09:00' }],
    })

    expect(messages[0].role).toBe('system')
    expect(messages[0].content).toContain('只返回 JSON')
    expect(messages[1].content).toContain('2026-05-30')
    expect(messages[1].content).toContain('明天下午3点项目会')
    expect(messages[1].content).toContain('团队周会')
  })
})
