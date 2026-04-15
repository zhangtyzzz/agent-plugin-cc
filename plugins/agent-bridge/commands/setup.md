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
        "command": "node \"${CLAUDE_PLUGIN_ROOT}/dist/bridge.js\" --task review --code-file /tmp/uab-stop-review.txt",
        "timeout": 120000
      }
    ]
  }
}
```

If `--disable-review-gate` is specified, remove the Stop hook entry.

Present the health output to the user.
