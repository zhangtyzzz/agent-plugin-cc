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
- `/agent:review` — Code review (auto-routes or `--agent codex`, supports `--scope auto|working-tree|branch`)
- `/agent:adversarial-review` — Adversarial security review
- `/agent:rescue` — Delegate debugging/fix to external agent
- `/agent:explain` — Code explanation
- `/agent:compare` — Multi-agent parallel comparison
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
