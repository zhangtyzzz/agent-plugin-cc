# Universal Agent Bridge

A Claude Code Plugin that bridges multiple CLI coding agents through a unified adapter layer with intelligent routing.

## Supported Agents

| Agent | CLI Binary | Auth Env Var | Strengths |
|-------|-----------|-------------|-----------|
| Codex | `codex` | `OPENAI_API_KEY` | Security, edge-cases, deep-reasoning, TypeScript |
| OpenCode | `opencode` | `OPENROUTER_API_KEY` | Multi-model, Python, cost-efficient, local-models |
| Gemini | `gemini` | `GOOGLE_API_KEY` | Search grounding, free-tier, fast, Google Cloud |
| QoderCLI | `qodercli` | `QODER_API_KEY` | Data analysis, SQL, business logic |

## Installation

```bash
# Clone and install dependencies
cd universal-agent-bridge
npm install

# Install in Claude Code
/plugin marketplace add ./universal-agent-bridge
/plugin install agent-bridge@universal-agent-bridge
/reload-plugins
```

Ensure at least one agent CLI is installed and its API key is set:
```bash
npm install -g @openai/codex           # Codex
brew install opencode                   # OpenCode
npm install -g @anthropic-ai/gemini-cli # Gemini CLI
```

## Plugin Commands

| Command | Description |
|---------|-------------|
| `/agent:review` | Code review (auto-routes or specify `--agent`) |
| `/agent:adversarial-review` | Adversarial security review |
| `/agent:rescue` | Delegate debugging/fix tasks to an external agent |
| `/agent:explain` | Code explanation |
| `/agent:compare` | Multi-agent parallel comparison |
| `/agent:list` | List available agents and their status |
| `/agent:health` | Health check all agents |
| `/agent:setup` | Setup, configure, and enable/disable review gate |

## CLI Usage (Direct)

```bash
# Health check
npx tsx plugins/agent-bridge/scripts/bridge.ts --task health

# List agents
npx tsx plugins/agent-bridge/scripts/bridge.ts --task list

# Review with auto-routing
echo "function add(a, b) { return a + b; }" > /tmp/code.txt
npx tsx plugins/agent-bridge/scripts/bridge.ts \
  --task review --code-file /tmp/code.txt

# Review with specific agent
npx tsx plugins/agent-bridge/scripts/bridge.ts \
  --task review --agent codex --code-file /tmp/code.txt

# Adversarial review focused on security
npx tsx plugins/agent-bridge/scripts/bridge.ts \
  --task adversarial-review --agent codex --code-file /tmp/code.txt --focus security

# Rescue/debug task
npx tsx plugins/agent-bridge/scripts/bridge.ts \
  --task rescue --agent codex --code-file /tmp/code.txt \
  --context "Function crashes when called without arguments"

# Compare multiple agents
npx tsx plugins/agent-bridge/scripts/bridge.ts \
  --task compare --agents codex,opencode,qoder --code-file /tmp/code.txt
```

## Configuration

Config is loaded with 3-tier merge (highest priority first):

1. `.universal-agent-bridge/config.yaml` — project-level
2. `~/.universal-agent-bridge/config.yaml` — user-level
3. `config/default-config.yaml` — built-in default

### Example config

```yaml
bridge:
  default_strategy: best_fit
  cost_limit_usd_per_day: 5.00
  log_level: info

agents:
  codex:
    enabled: true
    auth_env: OPENAI_API_KEY
    cli_binary: codex
    strengths: [security, edge-cases, deep-reasoning, typescript]
    cost_per_1k: { input: 0.003, output: 0.012 }

  opencode:
    enabled: true
    auth_env: OPENROUTER_API_KEY
    cli_binary: opencode
    strengths: [multi-model, python, cost-efficient, local-models]

routing_rules:
  - match: { task_type: security_audit }
    route_to: codex
    reason: "Codex security audit training advantage"

fallback_chain: [codex, gemini, qoder]
```

## Auto-Review Gate (Stop Hook)

Enable automatic external code review whenever Claude Code finishes a task:

```
/agent:setup --enable-review-gate
```

This creates a Stop hook in `.claude/settings.json` that triggers an auto-routed review. Disable with:

```
/agent:setup --disable-review-gate
```

## Routing

The router selects agents using:

1. **Custom rules** — match by task type, language, focus, or keyword
2. **Best-fit scoring** — capability match + strength match + cost preference
3. **Fallback chain** — ordered list of fallback agents

## Cost Tracking

Every agent execution is logged to `~/.universal-agent-bridge/cost.log` as newline-delimited JSON:

```json
{"timestamp":"2026-04-15T07:50:00.000Z","agent":"codex","task":"review","latencyMs":73000,"model":"codex-1"}
```

## Architecture

```
plugins/agent-bridge/
├── .claude-plugin/plugin.json    # Plugin manifest
├── commands/                     # Slash commands (/agent:*)
├── agents/                      # Subagents (rescue, reviewer)
├── hooks/                       # Hook definitions (review gate)
└── scripts/                     # Companion scripts (TypeScript)
    ├── bridge.ts                 # Main entry point
    ├── router.ts                 # Intelligent routing engine
    ├── config.ts                 # 3-tier YAML config loader
    └── adapters/                 # Per-agent adapters
        ├── base.ts               # Abstract adapter + shared utils
        ├── codex.ts              # OpenAI Codex CLI
        ├── opencode.ts           # OpenCode CLI
        ├── gemini.ts             # Gemini CLI
        └── qoder.ts              # Qoder CLI
```
