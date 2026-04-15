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
- `<job-id>`: show details for a specific job (validate: alphanumeric + hyphens only)
- `--wait`: poll until the specified job finishes
- `--all`: show all jobs (not just recent 8)

Execution:
1. Parse the arguments. Extract job-id (positional), --wait, and --all flags.
2. Build the command with properly quoted arguments:
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/dist/bridge.js" --task status [--job-id "<job-id>"] [--wait] [--all]
   ```
3. Run it and return the output verbatim.
4. Do not paraphrase, summarize, or add commentary.
5. IMPORTANT: Do not pass raw unquoted user input into the shell command. Always quote the job-id value.
