---
description: Delegate investigation or fix request to an external AI agent
argument-hint: '[--background|--wait] [--agent <name>] [what to investigate or fix]'
context: fork
allowed-tools: Bash(node:*), Bash(mktemp:*), Bash(cat:*), Bash(rm:*), AskUserQuestion
---

Hand the request off to an external CLI agent (codex / opencode / qoder) through the Universal Agent Bridge.

Raw slash-command arguments:
`$ARGUMENTS`

Core constraint:
- Do not investigate, edit code, run tests, or do any work yourself.
- Your only job is to forward the task to bridge.js and return its stdout verbatim.

Argument handling:
- `--agent <name>`: Route to a specific agent (codex, opencode, qoder). If omitted, auto-route.
- `--background`: Launch via Claude background task. Bridge returns a job-start handle.
- `--wait`: Force foreground.
- Routing flags (`--agent`, `--background`, `--wait`) are NOT part of the task text. Strip them before writing to the temp file. Forward `--agent` to bridge.js; `--background` / `--wait` only control whether you launch in background.

Execution mode:
- If the arguments include `--background`, run in background.
- If the arguments include `--wait`, run in foreground.
- If neither flag is present, default to foreground.

Foreground flow (single Bash call — write task text to a fresh mktemp file, run bridge, clean up):
```bash
TMPFILE=$(mktemp /tmp/uab-rescue-XXXXXX) && cat > "$TMPFILE" <<'PROMPT_EOF'
<the task text from $ARGUMENTS with --background, --wait, --agent <name> stripped>
PROMPT_EOF
node "${CLAUDE_PLUGIN_ROOT}/dist/bridge.js" --task rescue --code-file "$TMPFILE" [--agent <name>]; rc=$?; rm -f "$TMPFILE"; exit $rc
```

Background flow:
- Same Bash command as above, but call `Bash` with `run_in_background: true`. After launching, tell the user the rescue started in the background and return any stdout that came back immediately (typically a job ID line).

Rules:
- Use exactly one `Bash` invocation per run. The mktemp + heredoc + bridge + rm chain must stay together so cleanup runs even on failure.
- The task text written to `$TMPFILE` is the user's natural-language request with routing flags removed. Do NOT include the routing flags inside the heredoc.
- Return the bridge stdout verbatim. No paraphrasing, no summarizing, no commentary before or after.
- If the user did not supply a task, ask once what to delegate.
