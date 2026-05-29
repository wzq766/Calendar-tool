import tempfile
import unittest
from datetime import datetime
from pathlib import Path

from calendar_tool.models import CalendarEvent
from calendar_tool.store import CalendarStore


class StoreTest(unittest.TestCase):
    def test_store_adds_and_lists_events_for_a_day(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            store = CalendarStore(Path(tmp_dir) / "calendar.db")
            event = CalendarEvent(
                title="项目会议",
                start_at=datetime(2026, 5, 30, 15, 0),
                source_text="明天下午三点提醒我开项目会议",
            )

            created = store.add_event(event)
            events = store.list_events_for_date(created.start_at.date())

            self.assertEqual(len(events), 1)
            self.assertEqual(events[0].id, created.id)
            self.assertEqual(events[0].title, "项目会议")

    def test_store_deletes_matching_event(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            store = CalendarStore(Path(tmp_dir) / "calendar.db")
            store.add_event(
                CalendarEvent(
                    title="项目会议",
                    start_at=datetime(2026, 5, 30, 15, 0),
                    source_text="明天下午三点提醒我开项目会议",
                )
            )

            deleted = store.delete_matching(
                title="项目会议",
                start_at=datetime(2026, 5, 30, 15, 0),
            )

            self.assertEqual(deleted, 1)
            self.assertEqual(store.list_events_for_date(datetime(2026, 5, 30).date()), [])


if __name__ == "__main__":
    unittest.main()
