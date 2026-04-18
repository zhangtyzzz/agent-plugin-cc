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
The Stop hook is already registered via the plugin's own `hooks/hooks.json` (auto-loaded by Claude Code), and uses `${CLAUDE_PLUGIN_ROOT}` so the path always points at the currently-installed plugin version. Do NOT add a hook entry to `.claude/settings.json` — that pins the path to a specific version and breaks on plugin upgrade. When `stopReviewGate` is true, the script runs the review; when false, it auto-approves.

If `--disable-review-gate` is specified, disable the state flag:
```bash
node -e "import('${CLAUDE_PLUGIN_ROOT}/dist/state.js').then(m => m.setConfig(process.cwd(), 'stopReviewGate', false))" --input-type=module
```

Present the health output to the user.
