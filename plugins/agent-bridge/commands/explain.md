---
description: Use an external agent to explain code
argument-hint: '[--agent <name>] [--files <glob>]'
disable-model-invocation: true
allowed-tools: Bash(node:*), Bash(mktemp:*), Bash(cat:*), Bash(rm:*), Read, Glob, Grep
---

Use an external AI agent to explain code step by step.

Raw slash-command arguments:
`$ARGUMENTS`

Argument handling:
- `--agent <name>`: Route to a specific agent (codex, opencode, qoder). If omitted, auto-route. Forward to bridge; do not include in the file content.
- `--files <glob>`: Optional glob of files whose contents form the explanation target. If absent, use the most recent uncommitted changes (`git diff HEAD`).

Execution (single Bash call — gather code into a fresh mktemp file, run bridge, clean up):

1. Resolve the code to explain:
   - With `--files <glob>`: `cat <matched files>` into the temp file.
   - Without `--files`: `git diff HEAD` into the temp file. If empty, fall back to the diff against `main` (`git diff main...HEAD`).

2. Foreground flow:
   ```bash
   TMPFILE=$(mktemp /tmp/uab-explain-XXXXXX) && <gather-command> > "$TMPFILE" && node "${CLAUDE_PLUGIN_ROOT}/dist/bridge.js" --task explain --code-file "$TMPFILE" [--agent <name>]; rc=$?; rm -f "$TMPFILE"; exit $rc
   ```

3. Return the command stdout verbatim. Do not paraphrase, summarize, or add commentary.

Rules:
- Use exactly one `Bash` invocation. Keep mktemp + gather + bridge + rm chained so cleanup runs even on failure.
- Do NOT pass `$ARGUMENTS` straight through to bridge — strip routing flags first and forward only `--agent`.
