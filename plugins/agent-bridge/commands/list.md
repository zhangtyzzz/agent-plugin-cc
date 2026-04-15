---
description: List all available external AI agents and their status
disable-model-invocation: true
allowed-tools: Bash(node:*)
---

Run:
```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/bridge.js" --task list
```

Return the output verbatim.
