import unittest
from datetime import datetime

from calendar_tool.parser import parse_command


class ParserTest(unittest.TestCase):
    def test_parse_add_event_from_chinese_voice_text(self):
        now = datetime(2026, 5, 29, 10, 0)

        command = parse_command("明天下午三点提醒我开项目会议", now=now)

        self.assertEqual(command.intent, "add")
        self.assertEqual(command.title, "开项目会议")
        self.assertEqual(command.start_at, datetime(2026, 5, 30, 15, 0))

    def test_parse_query_today_events(self):
        now = datetime(2026, 5, 29, 10, 0)

        command = parse_command("今天有什么安排", now=now)

        self.assertEqual(command.intent, "query")
        self.assertEqual(command.date.isoformat(), "2026-05-29")

    def test_parse_delete_event_with_time_and_title(self):
        now = datetime(2026, 5, 29, 10, 0)

        command = parse_command("删除明天下午三点的项目会议", now=now)

        self.assertEqual(command.intent, "delete")
        self.assertEqual(command.title, "项目会议")
        self.assertEqual(command.start_at, datetime(2026, 5, 30, 15, 0))


if __name__ == "__main__":
    unittest.main()
