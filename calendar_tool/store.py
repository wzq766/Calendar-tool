import sqlite3
from datetime import date, datetime, time
from pathlib import Path

from calendar_tool.models import CalendarEvent


class CalendarStore:
    def __init__(self, db_path: str | Path = "data/calendar.db") -> None:
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._initialize()

    def add_event(self, event: CalendarEvent) -> CalendarEvent:
        connection = self._connect()
        try:
            cursor = connection.execute(
                """
                INSERT INTO events
                    (title, start_at, source_text, remind_before_minutes, completed)
                VALUES (?, ?, ?, ?, ?)
                """,
                (
                    event.title,
                    event.start_at.isoformat(timespec="minutes"),
                    event.source_text,
                    event.remind_before_minutes,
                    int(event.completed),
                ),
            )
            connection.commit()
            event_id = int(cursor.lastrowid)
        finally:
            connection.close()
        return CalendarEvent(
            id=event_id,
            title=event.title,
            start_at=event.start_at,
            source_text=event.source_text,
            remind_before_minutes=event.remind_before_minutes,
            completed=event.completed,
        )

    def list_events_for_date(self, target_date: date) -> list[CalendarEvent]:
        start = datetime.combine(target_date, time.min).isoformat(timespec="minutes")
        end = datetime.combine(target_date, time.max).isoformat(timespec="minutes")
        connection = self._connect()
        try:
            rows = connection.execute(
                """
                SELECT id, title, start_at, source_text, remind_before_minutes, completed
                FROM events
                WHERE start_at BETWEEN ? AND ?
                ORDER BY start_at ASC
                """,
                (start, end),
            ).fetchall()
        finally:
            connection.close()
        return [self._row_to_event(row) for row in rows]

    def list_upcoming_events(self, limit: int = 20) -> list[CalendarEvent]:
        now = datetime.now().isoformat(timespec="minutes")
        connection = self._connect()
        try:
            rows = connection.execute(
                """
                SELECT id, title, start_at, source_text, remind_before_minutes, completed
                FROM events
                WHERE start_at >= ? AND completed = 0
                ORDER BY start_at ASC
                LIMIT ?
                """,
                (now, limit),
            ).fetchall()
        finally:
            connection.close()
        return [self._row_to_event(row) for row in rows]

    def delete_matching(self, title: str = "", start_at: datetime | None = None) -> int:
        clauses: list[str] = []
        values: list[str] = []
        if title:
            clauses.append("title LIKE ?")
            values.append(f"%{title}%")
        if start_at:
            clauses.append("start_at = ?")
            values.append(start_at.isoformat(timespec="minutes"))
        if not clauses:
            return 0

        connection = self._connect()
        try:
            cursor = connection.execute(
                f"DELETE FROM events WHERE {' AND '.join(clauses)}",
                values,
            )
            connection.commit()
        finally:
            connection.close()
        return int(cursor.rowcount)

    def _initialize(self) -> None:
        connection = self._connect()
        try:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    start_at TEXT NOT NULL,
                    source_text TEXT NOT NULL DEFAULT '',
                    remind_before_minutes INTEGER NOT NULL DEFAULT 10,
                    completed INTEGER NOT NULL DEFAULT 0
                )
                """
            )
            connection.commit()
        finally:
            connection.close()

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.db_path)
        connection.row_factory = sqlite3.Row
        return connection

    @staticmethod
    def _row_to_event(row: sqlite3.Row) -> CalendarEvent:
        return CalendarEvent(
            id=int(row["id"]),
            title=str(row["title"]),
            start_at=datetime.fromisoformat(str(row["start_at"])),
            source_text=str(row["source_text"]),
            remind_before_minutes=int(row["remind_before_minutes"]),
            completed=bool(row["completed"]),
        )
