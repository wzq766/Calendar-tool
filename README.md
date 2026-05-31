# 语音日历工具

一个网页端语音优先日历工具。基于 Next.js + React，实现了大模型语音转写（千问 DashScope）、DeepSeek 日程指令解析、静音自动停止录音、一句话多事件识别等能力，提供日/周/月/年视图与年历快速导航。

## 项目亮点

- **一句话多事件**："添加下午五点的需求评审会，还有七点的客户见面会" → 自动拆为两条，依次确认创建。
- **静音自动停止**：说完停顿 2 秒自动结束录音并转写，无需手动点击停止按钮。
- **按时间模糊删除**："删除今天下午两点的会议" → 自动匹配"产品评审"，不需记住事件名称。
- **LLM + 本地规则双保险**：优先 DeepSeek 解析，失败自动降级本地规则——演示不依赖外部服务。
- **年历快速导航**：点击左上角月份标题展开全年 12 格月历，一键跳转任意月份。
- **确认卡片可编辑**：语音解析结果会展示可编辑确认卡片（标题/日期/起止时间/提醒），确认后才创建。

## 当前实现

- 网页端应用，基于 Next.js 和 React，不再依赖 Python。
- 左侧迷你月历：月份/年份切换、年历快速导航、回到今天、点击选择日期，周末标红。
- 右侧事件面板：日、周、月、年四种视图。
- 语音控制面板：点击麦克风开始录音，静音 2 秒自动停止并上传转写，支持说话状态指示。
- 文字输入兜底：语音不可用时可直接输入自然语言命令并解析。
- 中文指令解析：优先通过服务端 DeepSeek API（`deepseek-v4-flash`）解析，失败自动回退本地规则。
- 大模型语音转写：千问 DashScope `qwen3-asr-flash` 模型，经 curl 代理穿透访问。
- 确认卡片：新增事件前可编辑标题、日期、起止时间和提醒，支持多事件队列依次确认。
- 本地持久化：事件保存到 `localStorage`，刷新后恢复。
- 浏览器提醒：支持准时/提前 5-30 分钟/1 小时提醒，Notification API 到点弹出。
- 示例数据：默认展示当天和明天的示例事件。

## 运行方式

需要 Node.js 20+。本项目使用 `pnpm-lock.yaml`，推荐通过 Corepack 调用 pnpm：

```bash
corepack pnpm install
corepack pnpm dev
```

如需启用 DeepSeek 解析和大模型语音转文字，在项目根目录创建 `.env.local`：

```bash
DEEPSEEK_API_KEY=你的 DeepSeek API Key
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-flash
# 推荐千问 DashScope ASR：
ASR_API_KEY=你的 DashScope API Key
ASR_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
ASR_MODEL=qwen3-asr-flash
# 或者 OpenAI ASR：
# ASR_BASE_URL=https://api.openai.com/v1
# ASR_MODEL=gpt-4o-mini-transcribe
```

如果不配置 `DEEPSEEK_API_KEY`，应用仍可运行，并会自动使用本地规则解析。若不配置 `ASR_API_KEY` 或 `OPENAI_API_KEY`，麦克风录音无法转写，但下方文字输入仍可继续演示 DeepSeek 日程解析。

打开：

```text
http://localhost:3000
```

如果 `corepack pnpm install` 因 pnpm 的构建脚本审批策略提示 `sharp` 需要批准，请按终端提示执行：

```bash
corepack pnpm approve-builds
```

然后重新安装依赖。

## 本地演示流程

1. 启动开发服务器：

   ```bash
   corepack pnpm dev
   ```

2. 在浏览器打开 `http://localhost:3000`。建议使用 Chrome 或 Edge，因为当前录音上传依赖浏览器 MediaRecorder API。

3. 确认页面首屏正常显示：
   - 顶部标题为“语音日历”。
   - 左侧显示迷你月历和语音控制面板。
   - 右侧显示日/月/年视图切换和事件列表。
   - 默认示例事件包括“团队周会”“产品评审”等。

4. 点击语音控制面板中的麦克风按钮开始录音，再次点击停止录音。浏览器弹出权限提示时，选择允许访问麦克风。如果麦克风不可用，也可以在语音面板下方输入同样的自然语言命令并点击“解析”。

5. 按下面顺序演示核心功能：
   - 添加事件：说或输入 `添加明天下午3点开会`，在确认卡片中检查标题、日期、开始和结束时间，然后点击“确认创建”，确认右侧事件列表切换到明天并出现新事件。
   - 添加提醒：说或输入 `明天下午3点开会提前30分钟提醒`，确认卡片会自动选择“提前 30 分钟”；首次使用浏览器提醒时，请允许页面发送通知。
   - 查看事件：说 `查看今天的安排`，确认右侧切回今天并显示当天事件。
   - 删除事件：说 `删除团队周会`，确认列表中的“团队周会”被移除。
   - 切换视图：点击“日 / 月 / 年”标签，展示同一批事件在不同时间范围下的列表效果。

6. 演示结束后，在终端按 `Ctrl+C` 停止开发服务器。

### 演示注意事项

- 大模型语音转文字需要联网、麦克风权限和可用的 `ASR_API_KEY` 或 `OPENAI_API_KEY`。
- 如果浏览器不支持 MediaRecorder，语音控制面板会提示录音功能不可用，但仍可用文字输入演示。
- 浏览器提醒依赖 Notification API，首次创建带提醒事件时需要允许页面通知权限。
- 事件数据保存在当前浏览器的 `localStorage`，更换浏览器或清理站点数据后不会同步恢复。

## 验证命令

```bash
corepack pnpm install --ignore-scripts
corepack pnpm test
.\node_modules\.bin\tsc.cmd --noEmit
.\node_modules\.bin\next.cmd build
```

说明：在部分 Windows 环境中，`corepack pnpm install` 可能会因为 pnpm 的依赖构建脚本审批策略停住；仅做本地代码验证时可使用 `--ignore-scripts` 安装依赖。

## 可用语音示例

- `添加明天下午3点开会`
- `添加下午五点的需求评审会，还有七点的客户见面会` ← 一句话多事件
- `明天下午3点开会提前30分钟提醒`
- `删除团队周会`
- `删除今天下午两点的会议` ← 按时间模糊匹配
- `查看今天的安排`

语音转文字依赖浏览器录音能力和后端 ASR 模型接口。建议使用 Chrome 或 Edge，并允许页面访问麦克风。说完后停顿 2 秒即可自动停止录音。

## 项目结构

```text
app/
  layout.tsx        # Next.js 根布局和页面 metadata
  page.tsx          # 首页入口
  api/transcribe/route.ts # 大模型语音转文字 API
  api/parse-command/route.ts # DeepSeek 日历指令解析 API
  globals.css       # 全局样式和主题变量
components/
  voice-calendar.tsx # 页面主工作台
  voice-control.tsx  # 语音控制面板
  mini-calendar.tsx  # 左侧迷你月历
  event-panel.tsx    # 日/月/年事件面板
  event-list.tsx     # 事件列表
  ui/                # shadcn 风格基础 UI 组件
lib/
  audio-transcription.ts     # ASR 模型配置、multipart 构造和响应解析
  calendar-command-api.ts    # 前端解析入口，DeepSeek 失败时回退本地规则
  deepseek-calendar-command.ts # DeepSeek 提示词、JSON 校验和命令转换
  use-speech-recognition.ts # MediaRecorder 录音上传封装
  use-calendar-events.ts    # 事件状态管理
  calendar-event-storage.ts # localStorage 序列化和恢复
  reminder-notifications.ts # 浏览器提醒调度
  voice-parser.ts           # 中文日历指令解析
  types.ts                  # 前端类型定义
```

## 与需求说明书的对照

需求来源：[语音日历工具_需求说明书.md](./doc/语音日历工具_需求说明书.md)。

| 需求项 | PRD 优先级 | 当前实现状态 | 说明 |
|---|---:|---|---|
| 网页端日历工具 | P0 | ✅ 已实现 | Next.js 网页端，日/周/月/年四视图。 |
| 语音添加事件 | P0 | ✅ 已实现 | 支持单事件和多事件（”添加A，还有B”），静音自动停止录音。 |
| 语音删除事件 | P0 | ✅ 已实现 | 支持按标题和按时间模糊匹配删除。 |
| 语音查看事件 | P0 | ✅ 已实现 | 支持按日期查看今天/明天/后天/下周等。 |
| 确认卡片 | P0 | ✅ 已实现 | 可编辑确认卡片，多事件队列依次确认。 |
| 本地持久化 | P0 | ✅ 已实现 | localStorage，刷新恢复。 |
| 大模型语音转写 | P0 | ✅ 已实现 | 千问 DashScope qwen3-asr-flash。 |
| LLM 指令解析 | P0 | ✅ 已实现 | DeepSeek v4-flash + 本地规则双保险。 |
| 浏览器提醒 | P1 | ✅ 已实现 | Notification API，多级提前提醒。 |
| 文字输入兜底 | 容错 | ✅ 已实现 | 语音不可用时可直接输入自然语言。 |
| 语音编辑事件 | P0 | ✅ 已实现 | “把产品评审改到明天上午10点”，模糊匹配+字段合并。 |
| 冲突检测 | P0 | ✅ 已实现 | 创建/编辑时检测时间重叠，红色/黄色警告，建议空闲时间。 |
| 多轮对话 | P1 | ✅ 已实现 | 删除/编辑歧义时自动列出候选事件，点击选择。 |
| 智能时间推荐 | P1 | ✅ 已实现 | 冲突时提示当天首个空闲时段，一键采用。 |
| 事件详情编辑 | P1 | 未实现 | 点击事件查看/编辑详情弹窗。 |
| 拖拽调整时间 | P1 | 未实现 | 事件列表拖拽。 |
| 语音搜索事件 | P1 | 未实现 | 跨周/跨月/关键词搜索。 |

## 下一步开发计划

1. **语音编辑事件**（当前）：支持”把明天会议改到下午3点”，匹配已有事件并修改时间/标题。
2. **冲突检测**：创建事件时检测时间重叠，提示用户选择覆盖或调整。
3. **多轮对话**：置信度低时追问确认，删除有歧义时列出候选项。
4. **智能时间推荐**：不指定具体时间时，自动建议空闲时段。
