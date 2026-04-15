---
description: Cancel a running agent background job
argument-hint: '<job-id>'
disable-model-invocation: true
allowed-tools: Bash(node:*)
---

Cancel a running or queued agent background job.

Raw slash-command arguments:
`$ARGUMENTS`

Argument handling:
- `<job-id>` (required): the job ID or prefix to cancel

Execution:
1. Run:
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/dist/bridge.js" --task cancel --job-id $ARGUMENTS
   ```
2. Return the output verbatim.
3. Do not paraphrase, summarize, or add commentary.
