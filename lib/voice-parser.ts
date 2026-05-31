import { CalendarEvent, ParsedCalendarCommand } from '@/lib/types'

const timePatterns: Record<string, string> = {
  '早上': '08:00',
  '上午': '09:00',
  '中午': '12:00',
  '下午': '14:00',
  '傍晚': '17:00',
  '晚上': '19:00',
  '夜里': '21:00',
}

const cnNumbers: Record<string, number> = {
  零: 0,
  一: 1,
  二: 2,
  两: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
  十: 10,
}

function normalizeText(text: string): string {
  return text.trim().replace(/\s+/g, '')
}

function parseChineseDate(text: string, baseDate: Date = new Date()): Date | null {
  const today = new Date(baseDate)
  today.setHours(0, 0, 0, 0)

  // 今天/明天/后天
  if (text.includes('大后天')) {
    const dayAfter = new Date(today)
    dayAfter.setDate(dayAfter.getDate() + 3)
    return dayAfter
  }
  if (text.includes('今天')) {
    return today
  }
  if (text.includes('明天')) {
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow
  }
  if (text.includes('后天')) {
    const dayAfter = new Date(today)
    dayAfter.setDate(dayAfter.getDate() + 2)
    return dayAfter
  }

  // 下周X
  const weekdayMatch = text.match(/下周([一二三四五六日天])/)
  if (weekdayMatch) {
    const weekdays: Record<string, number> = {
      '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '日': 0, '天': 0
    }
    const targetDay = weekdays[weekdayMatch[1]]
    const nextWeek = new Date(today)
    const currentDay = nextWeek.getDay()
    const daysUntilNextWeek = (7 - currentDay + targetDay) % 7 + 7
    nextWeek.setDate(nextWeek.getDate() + daysUntilNextWeek)
    return nextWeek
  }

  // 这周X / 周X / 星期X
  const thisWeekMatch = text.match(/(这周|周|星期)([一二三四五六日天])/)
  if (thisWeekMatch) {
    const weekdays: Record<string, number> = {
      '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '日': 0, '天': 0
    }
    const targetDay = weekdays[thisWeekMatch[2]]
    const thisWeek = new Date(today)
    const currentDay = thisWeek.getDay()
    const diff = targetDay - currentDay
    thisWeek.setDate(thisWeek.getDate() + (diff >= 0 ? diff : diff + 7))
    return thisWeek
  }

  // X月X日 / X号
  const dateMatch = text.match(/(\d{1,2})月(\d{1,2})[日号]/)
  if (dateMatch) {
    const month = parseInt(dateMatch[1]) - 1
    const day = parseInt(dateMatch[2])
    const date = new Date(today.getFullYear(), month, day)
    if (date < today) {
      date.setFullYear(date.getFullYear() + 1)
    }
    return date
  }

  // X号
  const dayMatch = text.match(/(\d{1,2})[日号]/)
  if (dayMatch) {
    const day = parseInt(dayMatch[1])
    const date = new Date(today.getFullYear(), today.getMonth(), day)
    if (date < today) {
      date.setMonth(date.getMonth() + 1)
    }
    return date
  }

  return null
}

function cnToNumber(value: string): number {
  if (!value) return 0
  if (value === '十') return 10
  if (value.startsWith('十')) {
    return 10 + (cnNumbers[value.slice(1)] ?? 0)
  }
  if (value.includes('十')) {
    const [left, right] = value.split('十')
    return (cnNumbers[left] ?? 1) * 10 + (cnNumbers[right] ?? 0)
  }
  return cnNumbers[value] ?? 0
}

function adjustHourForPeriod(hour: number, period: string): number {
  if (['下午', '傍晚', '晚上', '夜里'].some(keyword => period.includes(keyword)) && hour < 12) {
    return hour + 12
  }
  if (period.includes('中午') && hour < 11) {
    return hour + 12
  }
  if (period.includes('凌晨') && hour === 12) {
    return 0
  }
  return hour
}

function parseTime(text: string): string | null {
  // 具体时间：下午3点、晚上8点、15:30、10点半
  const timeMatch = text.match(/(凌晨|早上|上午|中午|下午|傍晚|晚上|夜里)?(\d{1,2})[点:：](半|(\d{1,2})分?)?/)
  if (timeMatch) {
    const period = timeMatch[1] || ''
    const hours = adjustHourForPeriod(parseInt(timeMatch[2]), period)
    const minutes = timeMatch[3] === '半' ? 30 : timeMatch[4] ? parseInt(timeMatch[4]) : 0
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
  }

  // 中文数字时间：下午两点半、上午十点、晚上八点二十
  const cnTimeMatch = text.match(/(凌晨|早上|上午|中午|下午|傍晚|晚上|夜里)?([零一二两三四五六七八九十]{1,3})点(半|([零一二两三四五六七八九十]{1,3})分?)?/)
  if (cnTimeMatch) {
    const period = cnTimeMatch[1] || ''
    const hours = adjustHourForPeriod(cnToNumber(cnTimeMatch[2]), period)
    const minutes = cnTimeMatch[3] === '半' ? 30 : cnTimeMatch[4] ? cnToNumber(cnTimeMatch[4]) : 0
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
  }

  // 模糊时间
  for (const [key, value] of Object.entries(timePatterns)) {
    if (text.includes(key)) {
      return value
    }
  }

  return null
}

function stripDateTimeWords(text: string): string {
  return text
    .replace(/提前(\d{1,3}|[零一二两三四五六七八九十]{1,3})(分钟|小时)提醒/g, '')
    .replace(/今天|明天|后天|大后天|下周[一二三四五六日天]|这周[一二三四五六日天]|周[一二三四五六日天]|星期[一二三四五六日天]/g, '')
    .replace(/\d{1,2}月\d{1,2}[日号]/g, '')
    .replace(/\d{1,2}[日号]/g, '')
    .replace(/(凌晨|早上|上午|中午|下午|傍晚|晚上|夜里)?\d{1,2}[点:：](半|\d{1,2}分?)?/g, '')
    .replace(/(凌晨|早上|上午|中午|下午|傍晚|晚上|夜里)?[零一二两三四五六七八九十]{1,3}点(半|[零一二两三四五六七八九十]{1,3}分?)?/g, '')
    .replace(/早上|上午|中午|下午|傍晚|晚上|夜里|凌晨/g, '')
}

function parseReminderBeforeMinutes(text: string): number | undefined {
  const reminderMatch = text.match(/提前(\d{1,3}|[零一二两三四五六七八九十]{1,3})(分钟|小时)提醒/)
  if (!reminderMatch) return undefined

  const amount = /^\d+$/.test(reminderMatch[1])
    ? parseInt(reminderMatch[1], 10)
    : cnToNumber(reminderMatch[1])
  const unit = reminderMatch[2]

  if (!amount) return undefined
  return unit === '小时' ? amount * 60 : amount
}

function parseTitle(text: string): string {
  const reminderMatch = text.match(/提醒我(.+)$/)
  if (reminderMatch?.[1]) {
    return stripDateTimeWords(reminderMatch[1]).replace(/^的/, '').trim()
  }

  const commandMatch = text.match(/(?:添加|新增|创建|安排|设置)(?:一个)?(.+)$/)
  const titleSource = commandMatch?.[1] || text
  return stripDateTimeWords(titleSource)
    .replace(/添加|新增|创建|安排|设置|提醒|一个|事件/g, '')
    .replace(/在|到|的/g, '')
    .trim()
}

export function parseVoiceCommand(text: string, existingEvents: CalendarEvent[]): ParsedCalendarCommand {
  const cleanText = normalizeText(text)
  const lowerText = cleanText.toLowerCase()

  // 删除事件
  if (lowerText.includes('删除') || lowerText.includes('取消') || lowerText.includes('移除')) {
    // 尝试匹配要删除的事件
    for (const event of existingEvents) {
      if (lowerText.includes(event.title.toLowerCase())) {
        return {
          action: 'delete',
          originalText: text,
          title: event.title,
        }
      }
    }
    // 没找到具体事件，提取可能的关键词
    const deleteMatch = text.match(/(?:删除|取消|移除)[了]?(.+?)(?:的事件|事件|$)/)
    if (deleteMatch) {
      return {
        action: 'delete',
        originalText: text,
        title: deleteMatch[1].trim(),
      }
    }
    return { action: 'delete', originalText: text }
  }

  // 查询事件
  if (lowerText.includes('查看') || lowerText.includes('查询') || lowerText.includes('显示') ||
      lowerText.includes('什么事') || lowerText.includes('有什么') || lowerText.includes('安排')) {
    const date = parseChineseDate(text)
    return {
      action: 'query',
      originalText: text,
      date: date || undefined,
    }
  }

  // 添加事件
  if (lowerText.includes('添加') || lowerText.includes('新增') || lowerText.includes('创建') ||
      lowerText.includes('安排') || lowerText.includes('设置') || lowerText.includes('提醒')) {
    const date = parseChineseDate(cleanText) || new Date()
    const time = parseTime(cleanText) || '09:00'
    const title = parseTitle(cleanText)
    const remindBeforeMinutes = parseReminderBeforeMinutes(cleanText)

    return {
      action: 'add',
      originalText: text,
      title: title || '新事件',
      date,
      time,
      remindBeforeMinutes,
    }
  }

  // 默认尝试添加事件
  const date = parseChineseDate(cleanText)
  if (date) {
    const time = parseTime(cleanText)
    const title = parseTitle(cleanText)
    const remindBeforeMinutes = parseReminderBeforeMinutes(cleanText)

    if (title) {
      return {
        action: 'add',
        originalText: text,
        title,
        date,
        time: time || '09:00',
        remindBeforeMinutes,
      }
    }
  }

  return { action: 'unknown', originalText: text }
}
