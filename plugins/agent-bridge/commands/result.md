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
- `<job-id>` (required): the job ID or prefix to look up (validate: alphanumeric + hyphens only)

Execution:
1. Extract the job-id from the arguments. Validate it contains only alphanumeric characters and hyphens.
2. Run:
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/dist/bridge.js" --task result --job-id "<job-id>"
   ```
3. Return the output verbatim.
4. Do not paraphrase, summarize, or add commentary.
5. IMPORTANT: Always quote the job-id value in the shell command.
