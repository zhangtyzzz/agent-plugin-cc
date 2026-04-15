---
description: Check whether external AI agents are ready and optionally toggle the review gate
argument-hint: '[--enable-review-gate|--disable-review-gate] [--agent <name>]'
allowed-tools: Bash(npx:*), Bash(npm:*), AskUserQuestion
---

Run:
```bash
npx tsx "${CLAUDE_PLUGIN_ROOT}/scripts/bridge.ts" --task health
```

If `--enable-review-gate` is specified, create the auto-review hook in `.claude/settings.json`:
```json
{
  "hooks": {
    "Stop": [
      {
        "matcher": "",
        "command": "npx tsx \"${CLAUDE_PLUGIN_ROOT}/scripts/bridge.ts\" --task review --code-file /tmp/uab-stop-review.txt",
        "timeout": 120000
      }
    ]
  }
}
```

If `--disable-review-gate` is specified, remove the Stop hook entry.

Present the health output to the user.
