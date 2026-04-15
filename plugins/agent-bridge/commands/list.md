---
description: List all available external AI agents and their status
disable-model-invocation: true
allowed-tools: Bash(npx:*)
---

Run:
```bash
npx tsx "${CLAUDE_PLUGIN_ROOT}/scripts/bridge.ts" --task list
```

Return the output verbatim.
