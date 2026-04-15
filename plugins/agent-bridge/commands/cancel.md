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
- `<job-id>` (required): the job ID or prefix to cancel (validate: alphanumeric + hyphens only)

Execution:
1. Extract the job-id from the arguments. Validate it contains only alphanumeric characters and hyphens.
2. Run:
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/dist/bridge.js" --task cancel --job-id "<job-id>"
   ```
3. Return the output verbatim.
4. Do not paraphrase, summarize, or add commentary.
5. IMPORTANT: Always quote the job-id value in the shell command.
