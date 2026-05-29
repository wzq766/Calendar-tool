# Calendar Tool

语音版日历工具，一个面向暑期训练营作品提交的 Windows 桌面端日历助手。项目重点展示完整桌面应用体验：语音或文字指令输入、中文日程解析、本地日程存储、日程查询、删除和到点提醒。

## 功能

- 中文指令添加日程：`明天下午三点提醒我开项目会议`
- 中文指令查询日程：`今天有什么安排`
- 中文指令删除日程：`删除明天下午三点的项目会议`
- SQLite 本地存储
- Windows 桌面窗口界面
- 到点前 10 分钟弹窗提醒
- 语音识别依赖缺失时，可使用同一输入框进行文字演示

## 技术栈

- Python 3.11+
- Tkinter 桌面界面
- SQLite 本地数据库
- SpeechRecognition + PyAudio 可选语音输入

## 快速开始

```bash
python main.py
```

如果需要启用麦克风语音识别：

```bash
python -m pip install -r requirements.txt
python main.py
```

## 测试

```bash
python -m unittest discover -s tests
```

## 项目结构

```text
calendar_tool/
  app.py       # 桌面界面与交互流程
  models.py    # 日程与语音命令数据模型
  parser.py    # 中文语音指令解析
  store.py     # SQLite 数据访问层
  voice.py     # 可选语音识别封装
tests/
  test_parser.py
  test_store.py
main.py
```

## GitHub 提交建议

1. 在 GitHub 新建仓库，建议仓库名为 `calendar-tool`。
2. 将本地仓库关联远程地址：

```bash
git remote add origin https://github.com/<your-name>/calendar-tool.git
git branch -M main
git push -u origin main
```

3. 在 README 中补充运行截图和演示视频链接。
