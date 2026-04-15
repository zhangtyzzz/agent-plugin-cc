---
description: Check whether external AI agents are ready and optionally toggle the review gate
argument-hint: '[--enable-review-gate|--disable-review-gate] [--agent <name>]'
allowed-tools: Bash(node:*), AskUserQuestion
---

Run:
```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/bridge.js" --task health
```

If `--enable-review-gate` is specified, create the auto-review hook in `.claude/settings.json`:
```json
{
  "hooks": {
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "node \"${CLAUDE_PLUGIN_ROOT}/dist/stop-review-gate.js\"",
            "timeout": 900
          }
        ]
      }
    ]
  }
}
```
Then enable the persistent state flag by running (from the project root, NOT from dist/):
```bash
node -e "import('${CLAUDE_PLUGIN_ROOT}/dist/state.js').then(m => m.setConfig(process.cwd(), 'stopReviewGate', true))" --input-type=module
```

If `--disable-review-gate` is specified, remove the Stop hook entry from `.claude/settings.json` and disable the state flag:
```bash
node -e "import('${CLAUDE_PLUGIN_ROOT}/dist/state.js').then(m => m.setConfig(process.cwd(), 'stopReviewGate', false))" --input-type=module
```

Present the health output to the user.
