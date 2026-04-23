---
name: agent-task
description: "Delegate tasks to external CLI coding agents (Codex, OpenCode, QoderCLI) via Universal Agent Bridge. Use when the user wants to send work to an external agent — code review, adversarial review, code explanation, or general task delegation. Supports multi-agent parallel execution with --agents for comparing results across agents. Trigger on: 'review my code with codex', 'use opencode to explain', 'delegate to agent', 'run review with codex and opencode', '/agent:task review', 'agent review', 'let codex handle this', 'compare agents', or any mention of external CLI agents reviewing, explaining, or working on code. Also trigger when user mentions codex, opencode, or qodercli by name."
---

# Agent Task Bridge

Route tasks to external CLI coding agents through bridge.js. This is a pure passthrough — bridge.js handles all logic internally including task type routing, agent selection, parallel execution, and background jobs.

## Quick reference

```
/agent:task review                                  # auto-routed code review
/agent:task review --agents codex,opencode          # parallel review, multiple agents
/agent:task review --scope branch --agent codex     # branch diff, pinned agent
/agent:task adversarial-review --background         # security review, async
/agent:task explain src/main.ts                     # code explanation
/agent:task fix the login bug --agent codex         # general task delegation
```

## Arguments

| Argument | What it does |
|----------|-------------|
| First word | Task type keyword: `review`, `adversarial-review`, `explain`. Anything else becomes the prompt for a general task. |
| `--agent <name>` | Pin to a specific agent: `codex`, `opencode`, `qoder` |
| `--agents <a,b>` | Run the same task on multiple agents in parallel (e.g. `--agents codex,opencode`) |
| `--background` | Run as an async background job (check with `/agent:status`) |
| `--scope auto\|working-tree\|branch` | Review scope (`auto` = dirty tree or branch diff) |
| `--base <ref>` | Base branch for `--scope branch` (default: `main`) |
| `--focus <area>` | Focus area for reviews (e.g. `security`, `performance`) |

## Execution

Run bridge.js with the user's arguments passed through verbatim:

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/bridge.js" $ARGUMENTS
```

If `$CLAUDE_PLUGIN_ROOT` is not set (e.g. running outside the plugin context), use the path relative to the project root:

```bash
node "plugins/agent-bridge/dist/bridge.js" $ARGUMENTS
```

## Rules

- **Do not** investigate, edit code, run tests, or do any work yourself.
- Use exactly **one** Bash invocation. Do not chain or wrap.
- Return bridge stdout **verbatim**. No paraphrasing, no summarizing, no commentary before or after.
- If the user did not supply any arguments, ask once what to delegate.
