# Universal Agent Bridge — Claude Code Plugin

## What This Is
A Claude Code plugin that bridges multiple CLI coding agents (Codex, OpenCode, Gemini CLI, QoderCLI) through a unified adapter layer with intelligent routing.

## Installation
```bash
# In Claude Code:
/plugin marketplace add ./universal-agent-bridge
/plugin install agent-bridge@universal-agent-bridge
/reload-plugins
```

Or clone and install manually:
```bash
git clone https://github.com/zhangtyzzz/agent-plugin-cc.git
cd agent-plugin-cc
npm install
```

## Slash Commands
- `/agent:review` — Code review (auto-routes or `--agent codex`)
- `/agent:adversarial-review` — Adversarial security review
- `/agent:rescue` — Delegate debugging/fix to external agent
- `/agent:explain` — Code explanation
- `/agent:compare` — Multi-agent parallel comparison
- `/agent:list` — List available agents
- `/agent:health` — Health check all agents
- `/agent:setup` — Setup + enable/disable auto-review gate

## Configuration
Edit `config/default-config.yaml` or create `~/.universal-agent-bridge/config.yaml`:
```yaml
agents:
  qoder:
    model: ultimate   # auto | efficient | ultimate | performance | lite
  opencode:
    model: anthropic/claude-sonnet-4  # or leave empty for default
```

## Prerequisites
At least one CLI agent must be installed:
- `npm install -g @openai/codex`
- `brew install opencode`
- `npm install -g @anthropic-ai/gemini-cli`
- QoderCLI (see qoder docs)
