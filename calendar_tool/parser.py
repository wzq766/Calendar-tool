import re
from datetime import date, datetime, time, timedelta

from calendar_tool.models import VoiceCommand


_CN_NUMBERS = {
    "零": 0,
    "一": 1,
    "二": 2,
    "两": 2,
    "三": 3,
    "四": 4,
    "五": 5,
    "六": 6,
    "七": 7,
    "八": 8,
    "九": 9,
    "十": 10,
}


def parse_command(text: str, now: datetime | None = None) -> VoiceCommand:
    current = now or datetime.now()
    clean_text = _normalize(text)
    intent = _parse_intent(clean_text)
    target_date = _parse_date(clean_text, current)
    target_time = _parse_time(clean_text)
    start_at = datetime.combine(target_date, target_time) if target_time else None
    title = _parse_title(clean_text, intent)

    return VoiceCommand(
        intent=intent,
        original_text=text,
        title=title,
        start_at=start_at,
        date=target_date,
    )


def _normalize(text: str) -> str:
    return re.sub(r"\s+", "", text.strip())


def _parse_intent(text: str) -> str:
    if any(word in text for word in ("删除", "取消", "移除")):
        return "delete"
    if any(word in text for word in ("查看", "查询", "有什么安排", "日程", "安排")):
        if not any(word in text for word in ("提醒我", "添加", "新增")):
            return "query"
    return "add"


def _parse_date(text: str, now: datetime) -> date:
    if "后天" in text:
        return (now + timedelta(days=2)).date()
    if "明天" in text:
        return (now + timedelta(days=1)).date()
    if "今天" in text or "今日" in text:
        return now.date()
    if "大后天" in text:
        return (now + timedelta(days=3)).date()

    match = re.search(r"(\d{1,2})月(\d{1,2})[日号]", text)
    if match:
        month = int(match.group(1))
        day = int(match.group(2))
        year = now.year
        candidate = date(year, month, day)
        if candidate < now.date():
            candidate = date(year + 1, month, day)
        return candidate

    return now.date()


def _parse_time(text: str) -> time | None:
    numeric_match = re.search(r"(\d{1,2})[:：点](\d{1,2})?", text)
    if numeric_match:
        hour = int(numeric_match.group(1))
        minute = int(numeric_match.group(2) or 0)
        return _adjust_period(hour, minute, text)

    cn_match = re.search(r"([早上上午中午下午晚上傍晚凌晨]*)([零一二两三四五六七八九十]{1,3})点(半|[零一二两三四五六七八九十]{1,3}分?)?", text)
    if cn_match:
        period = cn_match.group(1)
        hour = _cn_to_int(cn_match.group(2))
        minute_text = cn_match.group(3) or ""
        minute = 30 if minute_text == "半" else _cn_to_int(minute_text.replace("分", "")) if minute_text else 0
        return _adjust_period(hour, minute, period)

    return None


def _adjust_period(hour: int, minute: int, text: str) -> time:
    if any(word in text for word in ("下午", "晚上", "傍晚")) and hour < 12:
        hour += 12
    if "中午" in text and hour < 11:
        hour += 12
    if hour == 24:
        hour = 0
    return time(hour=hour, minute=minute)


def _cn_to_int(value: str) -> int:
    if not value:
        return 0
    if value == "十":
        return 10
    if value.startswith("十"):
        return 10 + _CN_NUMBERS.get(value[-1], 0)
    if "十" in value:
        left, right = value.split("十", 1)
        return _CN_NUMBERS.get(left, 1) * 10 + _CN_NUMBERS.get(right, 0)
    return _CN_NUMBERS.get(value, 0)


def _parse_title(text: str, intent: str) -> str:
    title = text
    title = re.sub(r"(今天|今日|明天|后天|大后天)", "", title)
    title = re.sub(r"\d{1,2}月\d{1,2}[日号]", "", title)
    title = re.sub(r"[早上上午中午下午晚上傍晚凌晨]*([零一二两三四五六七八九十]{1,3}|\d{1,2})[点:：](半|[零一二两三四五六七八九十\d]{1,3}分?)?", "", title)
    title = re.sub(r"^(请|帮我)?(添加|新增|安排|删除|取消|移除|查看|查询)", "", title)
    title = title.replace("提醒我", "").replace("的", "")

    if intent == "query":
        return ""
    return title or "未命名日程"
