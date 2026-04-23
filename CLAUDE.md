# Universal Agent Bridge — Claude Code Plugin

## What This Is
A Claude Code plugin that bridges multiple CLI coding agents (Codex, OpenCode, QoderCLI) through a unified adapter layer with intelligent routing.

## Installation
In Claude Code, run:
```
/plugin marketplace add zhangtyzzz/agent-plugin-cc
/plugin install agent-bridge@universal-agent-bridge
```

No `git clone` or `npm install` required — Claude Code pulls the repo automatically, and compiled JS is included.

## Slash Commands
- `/agent:task` — Unified task command (pure passthrough to bridge.js). First positional selects type: `review`, `adversarial-review`, `explain`, or general task. Add `--agents codex,opencode` for multi-agent parallel execution on any task type.
- `/agent:list` — List available agents
- `/agent:health` — Health check all agents
- `/agent:setup` — Setup + enable/disable auto-review gate
- `/agent:status` — Show background job status
- `/agent:result` — Show completed job output
- `/agent:cancel` — Cancel a running background job

## Configuration
All three agents are enabled by default (zero-config). The router auto-skips agents whose CLI is not installed. To customize, create `~/.universal-agent-bridge/config.json`:
```json
{
  "agents": {
    "codex": { "model": "o3" },
    "qoder": { "model": "ultimate" },
    "opencode": { "model": "anthropic/claude-sonnet-4" }
  }
}
```

## Prerequisites
At least one CLI agent must be installed:
- `npm install -g @openai/codex`
- `brew install opencode`
- QoderCLI (see https://docs.qoder.com/cli/using-cli)

## Versioning

### Version bump
版本号分布在 **三个文件**，必须保持一致：
| 文件 | 字段 |
|------|------|
| `.claude-plugin/marketplace.json` | 顶层 `version` + `plugins[0].version` |
| `plugins/agent-bridge/.claude-plugin/plugin.json` | `version` |
| `package.json` | `version` |

**用脚本一键同步：**
```bash
./scripts/bump-version.sh 1.0.2
```
每次发版必须 bump——Claude Code 按版本号缓存，相同版本不会重新下载。用户通过 `/plugin` 触发更新。

### marketplace.json 格式规范
`.claude-plugin/marketplace.json` 必须符合 Claude Code 官方规范，要点：
- `description` 和 `version` 必须是**顶层字段**，不要用 `metadata` 包装
- `owner` 是对象：`{"name": "tianyi"}`
- `plugins[].author` 必须是对象（`{"name": "..."}`），不能是字符串
- `plugins[].source` 用相对路径指向插件目录
- `name` 字段不能包含 `anthropic`、`claude`、`official` 等保留词

正确示例：
```json
{
  "name": "universal-agent-bridge",
  "version": "1.0.1",
  "description": "...",
  "owner": { "name": "tianyi" },
  "plugins": [{
    "name": "agent-bridge",
    "version": "1.0.1",
    "author": { "name": "tianyi" },
    "source": "./plugins/agent-bridge"
  }]
}
```
