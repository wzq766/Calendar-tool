# 语音日历工具

一个网页端语音优先日历工具原型。当前版本基于 Next.js 和 React，实现了大模型语音转文字、DeepSeek 日程指令解析、添加/删除/查看日程的基础闭环，并提供左侧迷你月历与右侧事件面板。

## 当前实现

- 网页端应用，不再依赖 Python、PySide6、SQLite、PyAudio 或 Windows 通知。
- 左侧迷你月历：支持月份切换、回到今天、点击选择日期。
- 右侧事件面板：支持日、月、年三种视图。
- 语音控制面板：点击麦克风录音，停止后上传到服务端 ASR 大模型接口转成中文文本。
- 文字输入兜底：语音不可用时可直接输入自然语言命令并解析。
- 中文指令解析：优先通过服务端 DeepSeek API 解析为结构化 JSON，失败时自动回退到本地规则解析。
- 确认卡片：新增事件前可检查并手动编辑标题、日期、开始时间、结束时间和提醒时间。
- 本地持久化：事件保存到 `localStorage`，刷新页面后仍会恢复新增和删除结果。
- 浏览器提醒：支持准时、提前 5/10/30 分钟、提前 1 小时提醒；浏览器通知权限允许后会到点弹出提醒。
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
ASR_API_KEY=你的 ASR 模型 API Key
ASR_BASE_URL=https://api.openai.com/v1
ASR_MODEL=gpt-4o-mini-transcribe
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
- `明天下午3点开会提前30分钟提醒`
- `删除团队周会`
- `查看今天的安排`

语音转文字依赖浏览器录音能力和后端 ASR 模型接口。建议使用 Chrome 或 Edge，并允许页面访问麦克风。

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
| 网页端日历工具 | P0 | 已实现 | 当前为 Next.js 网页端应用。 |
| 语音添加事件 | P0 | 部分实现 | 可通过 MediaRecorder 录音并调用 ASR 大模型转文字，再优先调用 DeepSeek 解析；未配置 DeepSeek API Key 时回退本地规则。 |
| 语音删除事件 | P0 | 部分实现 | 支持按标题匹配删除，未提供歧义候选确认。 |
| 语音查看事件 | P0 | 部分实现 | 支持按日期查看，查询范围和自然语言覆盖有限。 |
| 确认环节 | P0 | 部分实现 | 新增事件前已有可编辑确认卡片；尚未实现语音播报确认和“确认/取消/修改”的语音回答。 |
| 日/月/年视图 | P0 | 已实现 | 右侧事件面板支持日、月、年视图。PRD 文中一处写“日/周/月”，当前实现是“日/月/年”，与界面设计方向一致。 |
| 事件展示与颜色区分 | P0 | 已实现 | 事件列表显示标题、日期、时间和颜色条。 |
| 语音编辑事件 | P1 | 未实现 | 目前没有修改事件的命令和编辑表单。 |
| 语音搜索事件 | P1 | 未实现 | 目前只支持基础日期查看，不支持跨周、跨月搜索和关键词搜索。 |
| 智能提醒 | P1 | 部分实现 | 支持提醒时间字段、确认卡片选择和浏览器 Notification API；尚未支持位置提醒、邮件/微信提醒和提醒记录。 |
| 事件详情查看 | P1 | 未实现 | 点击事件没有详情弹窗或详情面板。 |
| 拖拽调整时间 | P1 | 未实现 | 当前事件列表不可拖拽。 |
| 本地存储 | MVP 建议 | 已实现 | 当前事件保存到浏览器 `localStorage`，刷新后可恢复。 |
| DeepSeek ASR/LLM | 技术建议 | 部分实现 | 已接入 DeepSeek LLM 做文本指令解析；语音转文字改为服务端 ASR 模型接口，DeepSeek 本身不承担 ASR。 |
| 文字输入兜底 | 容错要求 | 已实现 | 语音面板提供自然语言文本输入，浏览器不支持录音或未配置 ASR Key 时仍可演示。 |
| 多轮对话与歧义处理 | 体验要求 | 未实现 | 没有置信度判断、追问或候选项选择。 |

## 当前差距总结

当前前端更接近“语音日历视觉原型 + 基础本地规则 demo”，已经完成网页端外观、月历导航、日/月/年事件展示、基础语音入口、本地持久化和浏览器提醒雏形。与 PRD 的完整 MVP 相比，主要差距在三个方面：

1. **语音确认不完整**：当前有可编辑确认卡片，但没有语音播报，也不能用语音回答确认/取消/修改。
2. **歧义处理不足**：删除候选匹配、多轮追问和置信度判断尚未实现。
3. **智能能力仍有限**：已接入 ASR 转写和 DeepSeek 文本指令解析，但复杂查询、编辑、冲突检测和置信度交互还不完整。

## 建议下一步

1. 扩展 DeepSeek 输出协议和前端执行层，支持编辑事件、下周/本月查询、候选删除确认。
2. 加入语音播报和语音回答确认/取消/修改。
3. 增加事件详情弹窗，支持地点、备注、提醒时间的后续编辑。
4. 根据实际账号选择稳定的 ASR 服务商，并增加转写失败重试、录音时长限制和文件大小限制。
