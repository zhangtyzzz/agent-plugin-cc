---
name: agent-task
description: "Delegate tasks to external CLI coding agents (Codex, OpenCode, QoderCLI). You are a coordinator — proactively distribute work to specialized agents. TRIGGER when: you need a fresh code review, security analysis (adversarial-review), code explanation, want parallel perspectives from multiple agents (--agents), or the user mentions codex/opencode/qodercli by name. Examples: large changes → delegate review; security concern → adversarial-review; need diverse opinions → --agents codex,opencode. Do not wait for explicit requests — use your judgment to decide when delegation adds value."
argument-hint: "[review|adversarial-review|explain|<task>] [--agent <name>] [--agents <a,b>] [--background] [--scope auto|working-tree|branch]"
---

# Agent Task Bridge

Route tasks to external CLI coding agents through bridge.js. This is a pure passthrough — bridge.js handles all logic internally including task type routing, agent selection, parallel execution, and background jobs.

You are a **coordinator**, not just a passthrough. Use your judgment to decide when delegating to an external agent adds value: large code changes, security-sensitive areas, complex explanations, or when you want a second opinion. The external agents are your team — dispatch work to them when appropriate.

## Quick reference

```
/agent:task review                                  # auto-routed code review
/agent:task review --background                     # run in background
/agent:task review --agents codex,opencode          # parallel review from multiple agents
/agent:task review --scope branch --agent codex     # branch diff, pinned agent
/agent:task adversarial-review --background         # security review, async
/agent:task explain src/main.ts                     # code explanation
/agent:task fix the login bug --agent codex         # general task delegation
```

**Tip**: For long-running tasks (large diffs, complex reviews), use `--background`. Check results later with `/agent:status` and `/agent:result`.

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
