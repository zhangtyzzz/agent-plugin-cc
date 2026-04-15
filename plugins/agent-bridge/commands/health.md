---
description: Check health status of all external AI agents
disable-model-invocation: true
allowed-tools: Bash(npx:*)
---

Run:
```bash
npx tsx "${CLAUDE_PLUGIN_ROOT}/scripts/bridge.ts" --task health
```

Return the output verbatim.
