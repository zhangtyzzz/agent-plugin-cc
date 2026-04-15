---
description: Show the stored result of a completed agent job
argument-hint: '<job-id>'
disable-model-invocation: true
allowed-tools: Bash(node:*)
---

Show the stored output from a finished agent background job.

Raw slash-command arguments:
`$ARGUMENTS`

Argument handling:
- `<job-id>` (required): the job ID or prefix to look up

Execution:
1. Run:
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/dist/bridge.js" --task result --job-id $ARGUMENTS
   ```
2. Return the output verbatim.
3. Do not paraphrase, summarize, or add commentary.
