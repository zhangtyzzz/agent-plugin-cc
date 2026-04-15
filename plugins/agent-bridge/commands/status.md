---
description: Show status of background agent jobs
argument-hint: '[job-id] [--wait] [--all]'
disable-model-invocation: true
allowed-tools: Bash(node:*), AskUserQuestion
---

Show the status of agent background jobs.

Raw slash-command arguments:
`$ARGUMENTS`

Argument handling:
- No arguments: show recent jobs table
- `<job-id>`: show details for a specific job
- `--wait`: poll until the specified job finishes
- `--all`: show all jobs (not just recent 8)

Execution:
1. Build the command:
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/dist/bridge.js" --task status $ARGUMENTS
   ```
2. Run it and return the output verbatim.
3. Do not paraphrase, summarize, or add commentary.
