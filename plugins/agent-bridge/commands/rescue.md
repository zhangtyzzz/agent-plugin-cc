---
description: Delegate investigation or fix request to an external AI agent
argument-hint: '[--background|--wait] [--agent <name>] [what to investigate or fix]'
context: fork
allowed-tools: Bash(node:*), AskUserQuestion
---

Hand the request off to an external CLI agent (codex / opencode / qoder) through the Universal Agent Bridge.

Raw slash-command arguments:
`$ARGUMENTS`

Core constraint:
- Do not investigate, edit code, run tests, or do any work yourself.
- Your only job is to invoke bridge.js and return its stdout verbatim.

Argument handling:
- All arguments are passed through to bridge.js. Do not strip, rewrite, or reorder them.
- bridge.js parses `--agent <name>`, `--background`, and `--wait` itself; remaining positional words become the prompt.

Execution mode:
- If the arguments include `--background`, run via `Bash(..., run_in_background: true)`.
- If the arguments include `--wait` or neither flag is present, run in foreground.

Foreground flow (one Bash call):
```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/bridge.js" --task rescue $ARGUMENTS
```

Background flow:
```typescript
Bash({
  command: `node "${CLAUDE_PLUGIN_ROOT}/dist/bridge.js" --task rescue $ARGUMENTS`,
  description: "Agent rescue",
  run_in_background: true
})
```
After launching, tell the user the rescue started in the background and that they can check `/agent:status`.

Rules:
- Use exactly one `Bash` invocation. Do not chain or wrap.
- Return the bridge stdout verbatim. No paraphrasing, no summarizing, no commentary before or after.
- If the user did not supply a task, ask once what to delegate.
