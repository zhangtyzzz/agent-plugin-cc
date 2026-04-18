# Universal Agent Bridge

Claude Code 插件 — 将多个 CLI 编码 Agent 通过统一适配层桥接到 Claude Code，支持智能路由。

## 支持的 Agent

| Agent | CLI | 擅长领域 |
|-------|-----|---------|
| Codex | `codex` | 安全审计、边界条件、深度推理、TypeScript |
| OpenCode | `opencode` | 多模型切换、Python、低成本、本地模型 |
| QoderCLI | `qodercli` | 数据分析、SQL、业务逻辑 |

> 只需安装对应 CLI 并配好 API Key 即可使用，插件不检查 Key，由各 CLI 自行鉴权。

## 安装

在 Claude Code 中直接运行：

```
/plugin marketplace add zhangtyzzz/agent-plugin-cc
/plugin install agent-bridge@universal-agent-bridge
```

无需 `git clone`，无需 `npm install` — Claude Code 自动拉取，编译后的 JS 已包含在仓库中。

各 Agent CLI 安装方式：
```bash
npm install -g @openai/codex           # Codex
brew install opencode                   # OpenCode
# QoderCLI 见 https://docs.qoder.com/cli/using-cli
```

## 插件命令（Slash Commands）

| 命令 | 说明 |
|------|------|
| `/agent:review` | 代码审查（自动路由或 `--agent codex` 指定） |
| `/agent:adversarial-review` | 对抗性安全审查 |
| `/agent:task` | 委派任务给外部 Agent |
| `/agent:explain` | 代码解释 |
| `/agent:compare` | 多 Agent 并行对比 |
| `/agent:list` | 列出可用 Agent |
| `/agent:health` | 健康检查 |
| `/agent:setup` | 配置 + 启用/禁用自动审查门禁 |
| `/agent:status` | 查看后台任务状态 |
| `/agent:result` | 查看已完成任务的输出 |
| `/agent:cancel` | 取消正在运行的后台任务 |

## 后台任务

支持将审查等耗时任务放到后台执行：

```bash
# 提交后台审查任务
/agent:review --background

# 查看任务状态
/agent:status

# 查看指定任务详情（支持前缀匹配）
/agent:status task-abc123

# 等待任务完成
/agent:status task-abc123 --wait

# 查看完成任务的结果
/agent:result task-abc123

# 取消正在运行的任务
/agent:cancel task-abc123
```

## 审查范围（--scope）

`/agent:review` 和 `/agent:adversarial-review` 支持 `--scope` 参数控制审查范围：

| Scope | 说明 |
|-------|------|
| `auto`（默认） | 有未提交修改时审查工作区，否则审查分支 diff |
| `working-tree` | 仅审查 `git diff`（暂存 + 未暂存） |
| `branch` | 审查 `git diff <base>...HEAD`（分支所有提交） |

```bash
/agent:review --scope working-tree --agent codex
/agent:review --scope branch --base develop
```

## 直接调用

```bash
# 健康检查
node plugins/agent-bridge/dist/bridge.js --task health

# 列出 Agent
node plugins/agent-bridge/dist/bridge.js --task list

# 自动路由审查
echo "function add(a, b) { return a + b; }" > /tmp/code.txt
node plugins/agent-bridge/dist/bridge.js \
  --task review --code-file /tmp/code.txt

# 指定 Agent 审查
node plugins/agent-bridge/dist/bridge.js \
  --task review --agent codex --code-file /tmp/code.txt

# 多 Agent 对比
node plugins/agent-bridge/dist/bridge.js \
  --task compare --agents codex,opencode,qoder \
  --code-file /tmp/code.txt

# 后台提交
node plugins/agent-bridge/dist/bridge.js \
  --task review --background --agent codex --code-file /tmp/code.txt

# 查看状态
node plugins/agent-bridge/dist/bridge.js --task status
```

## 配置

插件内置默认配置，安装后即可使用（零配置）。三个 Agent（Codex、OpenCode、QoderCLI）默认全部启用，路由器会自动跳过未安装的 Agent，只路由到健康可用的 Agent。

如需自定义配置（切换模型、禁用某个 Agent、调整路由规则等），可创建覆盖配置文件，优先级从高到低：

1. `.universal-agent-bridge/config.json` — 项目级覆盖
2. `~/.universal-agent-bridge/config.json` — 用户级覆盖
3. 内置默认 — 代码中硬编码，始终可用

### 模型配置

每个 Agent 都可以通过 `model` 字段指定模型：

```json
{
  "agents": {
    "codex": {
      "model": "o3"
    },
    "opencode": {
      "model": "anthropic/claude-sonnet-4"
    },
    "qoder": {
      "model": "ultimate"
    }
  }
}
```

将以上内容保存到 `~/.universal-agent-bridge/config.json`（全局生效）或项目根目录 `.universal-agent-bridge/config.json`（仅当前项目生效）。

#### 各 Agent 模型说明

**Codex** — 传入 `--model` 参数给 `codex exec`：
- `o3`、`o4-mini`、`codex-mini` 等（见 `codex exec --help`）

**OpenCode** — 传入 `--model` 参数给 `opencode`：
- `anthropic/claude-sonnet-4`、`openai/gpt-4o` 等（取决于 provider 配置）
- 不指定则使用 OpenCode 默认模型

**QoderCLI** — 传入 `--model` 参数给 `qodercli`：
- `ultimate`（极致模型，**默认**）
- `auto`（自动选择）
- `efficient`（高效模型）
- `performance`（性能模型）
- `lite`（轻量模型）

### 完整配置示例

```json
{
  "bridge": {
    "default_strategy": "best_fit",
    "cost_limit_usd_per_day": 5.00
  },
  "agents": {
    "codex": {
      "enabled": true,
      "model": "o3",
      "strengths": ["security", "edge-cases", "deep-reasoning", "typescript"],
      "cost_per_1k": { "input": 0.003, "output": 0.012 }
    },
    "opencode": {
      "enabled": true
    },
    "qoder": {
      "enabled": true,
      "model": "ultimate"
    }
  },
  "routing_rules": [
    {
      "match": { "task_type": "review", "language": "python" },
      "route_to": "opencode",
      "reason": "OpenCode 擅长 Python"
    }
  ],
  "fallback_chain": ["codex", "opencode", "qoder"]
}
```

### 禁用某个 Agent

```json
{
  "agents": {
    "opencode": { "enabled": false }
  }
}
```

## 自动审查门禁（Stop Hook）

让 Claude Code 每次完成任务时自动触发外部 Agent 审查：

```
/agent:setup --enable-review-gate
```

关闭：
```
/agent:setup --disable-review-gate
```

门禁会在 Claude Code 结束前自动运行审查，如发现问题会阻止退出并给出理由。

## 路由机制

Router 按以下顺序选择 Agent：

1. **自定义规则** — 按任务类型、语言、聚焦领域、关键词匹配
2. **最佳匹配评分** — 能力匹配 + 特长匹配 + 成本偏好（大小写不敏感）
3. **兜底链** — 按顺序尝试可用 Agent

## 成本追踪

每次调用自动记录到 `~/.universal-agent-bridge/cost.log`（NDJSON 格式）：

```json
{"timestamp":"2026-04-15T07:50:00.000Z","agent":"codex","task":"review","latencyMs":73000,"model":"codex-1"}
```

## 项目结构

```
plugins/agent-bridge/
├── .claude-plugin/plugin.json    # 插件清单
├── commands/                     # Slash 命令 (/agent:*)
├── agents/                       # 子代理 (task, reviewer)
├── hooks/                        # Hook 定义 (审查门禁)
├── scripts/                      # TypeScript 源码
│   ├── bridge.ts                  # 主入口
│   ├── router.ts                  # 智能路由引擎
│   ├── config.ts                  # 内嵌默认 + 用户/项目级配置覆盖
│   ├── state.ts                   # 任务状态持久化管理
│   ├── stop-review-gate.ts        # Stop 审查门禁 Hook
│   └── adapters/                  # 各 Agent 适配器
│       ├── base.ts                # 抽象基类 + 重试 + 成本日志
│       ├── codex.ts               # OpenAI Codex
│       ├── opencode.ts            # OpenCode
│       └── qoder.ts               # QoderCLI
└── dist/                          # 编译后的 JS（已提交到仓库）
```
