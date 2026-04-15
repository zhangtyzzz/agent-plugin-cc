---
description: Check health status of all external AI agents
disable-model-invocation: true
allowed-tools: Bash(node:*)
---

Run:
```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/bridge.js" --task health
```

Return the output verbatim.
