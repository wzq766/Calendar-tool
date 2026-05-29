import tkinter as tk
from datetime import date, datetime
from tkinter import messagebox, ttk

from calendar_tool.models import CalendarEvent
from calendar_tool.parser import parse_command
from calendar_tool.store import CalendarStore
from calendar_tool.voice import VoiceRecognizer


class CalendarApp(tk.Tk):
    def __init__(self) -> None:
        super().__init__()
        self.title("Calendar Tool - 语音日历助手")
        self.geometry("980x640")
        self.minsize(860, 560)
        self.store = CalendarStore()
        self.voice = VoiceRecognizer()
        self._notified_event_ids: set[int] = set()

        self._build_ui()
        self._refresh_events()
        self._schedule_reminder_check()

    def _build_ui(self) -> None:
        self.columnconfigure(0, weight=3)
        self.columnconfigure(1, weight=2)
        self.rowconfigure(1, weight=1)

        header = ttk.Frame(self, padding=(18, 16, 18, 8))
        header.grid(row=0, column=0, columnspan=2, sticky="ew")
        header.columnconfigure(1, weight=1)

        ttk.Label(header, text="语音日历助手", font=("Microsoft YaHei UI", 20, "bold")).grid(row=0, column=0, sticky="w")
        ttk.Label(header, text="说出日程，应用完成识别、解析、存储和提醒", foreground="#555").grid(row=1, column=0, sticky="w", pady=(4, 0))

        command_panel = ttk.Frame(self, padding=(18, 8, 10, 18))
        command_panel.grid(row=1, column=0, sticky="nsew")
        command_panel.columnconfigure(0, weight=1)
        command_panel.rowconfigure(4, weight=1)

        ttk.Label(command_panel, text="语音或文字指令", font=("Microsoft YaHei UI", 12, "bold")).grid(row=0, column=0, sticky="w")
        self.command_var = tk.StringVar(value="明天下午三点提醒我开项目会议")
        command_entry = ttk.Entry(command_panel, textvariable=self.command_var, font=("Microsoft YaHei UI", 12))
        command_entry.grid(row=1, column=0, sticky="ew", pady=(8, 8))
        command_entry.bind("<Return>", lambda _event: self._run_command())

        buttons = ttk.Frame(command_panel)
        buttons.grid(row=2, column=0, sticky="w")
        ttk.Button(buttons, text="执行指令", command=self._run_command).grid(row=0, column=0, padx=(0, 8))
        ttk.Button(buttons, text="开始语音", command=self._listen_voice).grid(row=0, column=1, padx=(0, 8))
        ttk.Button(buttons, text="查看今天", command=self._show_today).grid(row=0, column=2)

        ttk.Label(command_panel, text="执行反馈", font=("Microsoft YaHei UI", 12, "bold")).grid(row=3, column=0, sticky="w", pady=(22, 6))
        self.feedback = tk.Text(command_panel, height=9, wrap="word", font=("Microsoft YaHei UI", 11))
        self.feedback.grid(row=4, column=0, sticky="nsew")
        self.feedback.configure(state="disabled")

        list_panel = ttk.Frame(self, padding=(10, 8, 18, 18))
        list_panel.grid(row=1, column=1, sticky="nsew")
        list_panel.columnconfigure(0, weight=1)
        list_panel.rowconfigure(1, weight=1)

        ttk.Label(list_panel, text="今日日程", font=("Microsoft YaHei UI", 12, "bold")).grid(row=0, column=0, sticky="w")
        columns = ("time", "title")
        self.event_tree = ttk.Treeview(list_panel, columns=columns, show="headings", height=14)
        self.event_tree.heading("time", text="时间")
        self.event_tree.heading("title", text="事件")
        self.event_tree.column("time", width=90, anchor="center")
        self.event_tree.column("title", minwidth=220)
        self.event_tree.grid(row=1, column=0, sticky="nsew", pady=(8, 16))

        ttk.Label(list_panel, text="即将到来", font=("Microsoft YaHei UI", 12, "bold")).grid(row=2, column=0, sticky="w")
        self.upcoming_list = tk.Listbox(list_panel, height=8, font=("Microsoft YaHei UI", 10))
        self.upcoming_list.grid(row=3, column=0, sticky="nsew", pady=(8, 0))

    def _run_command(self) -> None:
        text = self.command_var.get().strip()
        if not text:
            self._write_feedback("请输入或说出一条日程指令。")
            return

        command = parse_command(text)
        if command.intent == "add":
            if not command.start_at:
                self._write_feedback("没有识别到时间，请补充例如“明天下午三点”。")
                return
            event = self.store.add_event(
                CalendarEvent(
                    title=command.title,
                    start_at=command.start_at,
                    source_text=text,
                )
            )
            self._write_feedback(f"已添加：{event.start_at:%Y-%m-%d %H:%M} {event.title}")
        elif command.intent == "query":
            events = self.store.list_events_for_date(command.date or date.today())
            if events:
                lines = [f"{event.start_at:%H:%M} {event.title}" for event in events]
                self._write_feedback("查询结果：\n" + "\n".join(lines))
            else:
                self._write_feedback("这一天暂时没有日程。")
        elif command.intent == "delete":
            deleted = self.store.delete_matching(title=command.title, start_at=command.start_at)
            self._write_feedback(f"已删除 {deleted} 条匹配日程。" if deleted else "没有找到匹配日程。")

        self._refresh_events()

    def _listen_voice(self) -> None:
        self._write_feedback("正在监听，请开始说话...")
        self.update_idletasks()
        try:
            text = self.voice.listen_once()
        except RuntimeError as exc:
            self._write_feedback(str(exc))
            return
        except Exception as exc:
            self._write_feedback(f"语音识别失败：{exc}")
            return
        self.command_var.set(text)
        self._write_feedback(f"识别结果：{text}")

    def _show_today(self) -> None:
        command = parse_command("今天有什么安排")
        events = self.store.list_events_for_date(command.date or date.today())
        lines = [f"{event.start_at:%H:%M} {event.title}" for event in events]
        self._write_feedback("今日安排：\n" + ("\n".join(lines) if lines else "暂无日程"))

    def _refresh_events(self) -> None:
        for item in self.event_tree.get_children():
            self.event_tree.delete(item)
        for event in self.store.list_events_for_date(date.today()):
            self.event_tree.insert("", "end", values=(event.start_at.strftime("%H:%M"), event.title))

        self.upcoming_list.delete(0, tk.END)
        for event in self.store.list_upcoming_events():
            self.upcoming_list.insert(tk.END, f"{event.start_at:%m-%d %H:%M}  {event.title}")

    def _schedule_reminder_check(self) -> None:
        now = datetime.now()
        for event in self.store.list_upcoming_events():
            if event.id and event.id not in self._notified_event_ids and event.remind_at <= now <= event.start_at:
                self._notified_event_ids.add(event.id)
                messagebox.showinfo("日程提醒", f"{event.start_at:%H:%M} {event.title}")
        self.after(30_000, self._schedule_reminder_check)

    def _write_feedback(self, message: str) -> None:
        self.feedback.configure(state="normal")
        self.feedback.delete("1.0", tk.END)
        self.feedback.insert(tk.END, message)
        self.feedback.configure(state="disabled")


def main() -> None:
    CalendarApp().mainloop()
