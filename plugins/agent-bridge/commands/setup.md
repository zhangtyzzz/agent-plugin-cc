---
description: Check whether external AI agents are ready and optionally toggle the review gate
argument-hint: '[--enable-review-gate|--disable-review-gate] [--agent <name>]'
allowed-tools: Bash(node:*), AskUserQuestion
---

Run:
```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/bridge.js" --task health
```

If `--enable-review-gate` is specified, enable the review gate by running (from the project root, NOT from dist/):
```bash
node -e "import('${CLAUDE_PLUGIN_ROOT}/dist/state.js').then(m => m.setConfig(process.cwd(), 'stopReviewGate', true))" --input-type=module
```
The Stop hook is already registered via `hooks/auto-review-gate.json` with `${CLAUDE_PLUGIN_ROOT}` — no need to create a separate hook entry in `.claude/settings.json`. When `stopReviewGate` is true, the stop-review-gate script runs the review; when false, it auto-approves.

If `--disable-review-gate` is specified, disable the state flag:
```bash
node -e "import('${CLAUDE_PLUGIN_ROOT}/dist/state.js').then(m => m.setConfig(process.cwd(), 'stopReviewGate', false))" --input-type=module
```

Present the health output to the user.
