from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta


@dataclass(frozen=True)
class CalendarEvent:
    title: str
    start_at: datetime
    source_text: str = ""
    id: int | None = None
    remind_before_minutes: int = 10
    completed: bool = False

    @property
    def remind_at(self) -> datetime:
        return self.start_at - timedelta(minutes=self.remind_before_minutes)


@dataclass(frozen=True)
class VoiceCommand:
    intent: str
    original_text: str
    title: str = ""
    start_at: datetime | None = None
    date: date | None = None
