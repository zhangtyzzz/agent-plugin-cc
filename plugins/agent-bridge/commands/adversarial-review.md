---
description: Run an adversarial code review that challenges implementation and finds vulnerabilities
argument-hint: '[--wait|--background] [--base <ref>] [--agent <name>] [--focus <area>] [--scope auto|working-tree|branch] [focus text ...]'
disable-model-invocation: true
allowed-tools: Read, Glob, Grep, Bash(node:*), Bash(git:*), AskUserQuestion
---

Run an adversarial code review through the Universal Agent Bridge.
Position it as a challenge review that questions the chosen implementation, design choices, tradeoffs, and assumptions.

Raw slash-command arguments:
`$ARGUMENTS`

Core constraint:
- This command is review-only.
- Do not fix issues, apply patches, or suggest that you are about to make changes.
- Your only job is to run the review and return the bridge's output verbatim.

Execution mode rules:
- If the raw arguments include `--wait`, do not ask. Run in the foreground.
- If the raw arguments include `--background`, do not ask. Run in a Claude background task.
- Otherwise, estimate the review size and use `AskUserQuestion` exactly once with:
  - `Wait for results` / `Run in background`

Argument handling:
- All arguments are passed through to bridge.js as-is.
- bridge.js parses `--agent <name>`, `--base <ref>`, `--focus <area>`, `--scope <mode>`, `--background` itself and auto-collects the git diff based on `--scope`.
- Extra positional text is passed as focus text.

Foreground flow (one Bash call):
```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/bridge.js" --task adversarial-review $ARGUMENTS
```

Background flow:
```typescript
Bash({
  command: `node "${CLAUDE_PLUGIN_ROOT}/dist/bridge.js" --task adversarial-review $ARGUMENTS`,
  description: "Agent adversarial review",
  run_in_background: true
})
```
After launching, tell the user the review started in the background.

Rules:
- Use exactly one `Bash` invocation. Do not chain or wrap.
- Return the bridge stdout verbatim. No paraphrasing, no summarizing.
