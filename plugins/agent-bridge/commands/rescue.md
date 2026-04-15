---
description: Delegate investigation or fix request to an external AI agent
argument-hint: '[--background|--wait] [--agent <name>] [what to investigate or fix]'
context: fork
allowed-tools: Bash(npx:*), AskUserQuestion
---

Route this request to the `agent-bridge:agent-rescue` subagent.
The final user-visible response must be the agent's output verbatim.

Raw user request:
$ARGUMENTS

Execution mode:
- If the request includes `--background`, run in the background.
- If the request includes `--wait`, run in the foreground.
- If neither flag is present, default to foreground.
- `--agent <name>`: Route to a specific agent. If omitted, auto-route.

Operating rules:
- Use exactly one `Bash` call to invoke:
  ```bash
  npx tsx "${CLAUDE_PLUGIN_ROOT}/scripts/bridge.ts" --task rescue --code-file /tmp/uab-rescue-input.txt $ARGUMENTS
  ```
- Return the stdout verbatim to the user.
- Do not paraphrase, summarize, or add commentary.
