# Universal Agent Bridge

Claude Code 插件 — 将多个 CLI 编码 Agent 通过统一适配层桥接到 Claude Code，支持智能路由。

## 支持的 Agent

| Agent | CLI | 擅长领域 |
|-------|-----|---------|
| Codex | `codex` | 安全审计、边界条件、深度推理、TypeScript |
| OpenCode | `opencode` | 多模型切换、Python、低成本、本地模型 |
| Gemini | `gemini` | 搜索增强、免费额度、速度快、Google Cloud |
| QoderCLI | `qodercli` | 数据分析、SQL、业务逻辑 |

> 只需安装对应 CLI 并配好 API Key 即可使用，插件不检查 Key，由各 CLI 自行鉴权。

## 安装

```bash
# 克隆并安装依赖
git clone https://github.com/zhangtyzzz/agent-plugin-cc.git
cd agent-plugin-cc
npm install

# 在 Claude Code 中安装插件
/plugin marketplace add ./agent-plugin-cc
/plugin install agent-bridge@universal-agent-bridge
/reload-plugins
```

各 Agent CLI 安装方式：
```bash
npm install -g @openai/codex           # Codex
brew install opencode                   # OpenCode
npm install -g @anthropic-ai/gemini-cli # Gemini CLI
# QoderCLI 见其官方文档
```

## 插件命令（Slash Commands）

| 命令 | 说明 |
|------|------|
| `/agent:review` | 代码审查（自动路由或 `--agent codex` 指定） |
| `/agent:adversarial-review` | 对抗性安全审查 |
| `/agent:rescue` | 委派调试/修复任务给外部 Agent |
| `/agent:explain` | 代码解释 |
| `/agent:compare` | 多 Agent 并行对比 |
| `/agent:list` | 列出可用 Agent |
| `/agent:health` | 健康检查 |
| `/agent:setup` | 配置 + 启用/禁用自动审查门禁 |

## 直接调用

```bash
# 健康检查
npx tsx plugins/agent-bridge/scripts/bridge.ts --task health

# 列出 Agent
npx tsx plugins/agent-bridge/scripts/bridge.ts --task list

# 自动路由审查
echo "function add(a, b) { return a + b; }" > /tmp/code.txt
npx tsx plugins/agent-bridge/scripts/bridge.ts \
  --task review --code-file /tmp/code.txt

# 指定 Agent 审查
npx tsx plugins/agent-bridge/scripts/bridge.ts \
  --task review --agent codex --code-file /tmp/code.txt

# 对抗审查 + 聚焦安全
npx tsx plugins/agent-bridge/scripts/bridge.ts \
  --task adversarial-review --agent codex \
  --code-file /tmp/code.txt --focus security

# 委派修复任务
npx tsx plugins/agent-bridge/scripts/bridge.ts \
  --task rescue --agent codex --code-file /tmp/code.txt \
  --context "函数不传参时崩溃"

# 多 Agent 对比
npx tsx plugins/agent-bridge/scripts/bridge.ts \
  --task compare --agents codex,opencode,qoder \
  --code-file /tmp/code.txt

# 生成代码
npx tsx plugins/agent-bridge/scripts/bridge.ts \
  --task generate --agent codex \
  --context "写一个暗色主题的 Hello World 网页"
```

## 配置

三层配置合并（优先级从高到低）：

1. `.universal-agent-bridge/config.yaml` — 项目级
2. `~/.universal-agent-bridge/config.yaml` — 用户级
3. `config/default-config.yaml` — 内置默认

### 配置示例

```yaml
bridge:
  default_strategy: best_fit
  cost_limit_usd_per_day: 5.00

agents:
  codex:
    enabled: true
    strengths: [security, edge-cases, deep-reasoning, typescript]
    cost_per_1k: { input: 0.003, output: 0.012 }

  opencode:
    enabled: true
    # model: anthropic/claude-sonnet-4  # 可选，不指定则用 opencode 默认

  qoder:
    enabled: true
    model: ultimate  # auto | efficient | ultimate | performance | lite

routing_rules:
  - match: { task_type: review, language: python }
    route_to: opencode
    reason: "OpenCode 擅长 Python"

fallback_chain: [codex, gemini, qoder]
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
├── agents/                       # 子代理 (rescue, reviewer)
├── hooks/                        # Hook 定义 (审查门禁)
└── scripts/                      # TypeScript 脚本
    ├── bridge.ts                  # 主入口
    ├── router.ts                  # 智能路由引擎
    ├── config.ts                  # 三层 YAML 配置加载
    └── adapters/                  # 各 Agent 适配器
        ├── base.ts                # 抽象基类 + 重试 + 成本日志
        ├── codex.ts               # OpenAI Codex
        ├── opencode.ts            # OpenCode
        ├── gemini.ts              # Gemini CLI
        └── qoder.ts               # QoderCLI
```
