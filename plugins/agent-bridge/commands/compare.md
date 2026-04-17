---
description: Run the same task on multiple agents and compare results
argument-hint: '[--agents <list>] [--base <ref>]'
disable-model-invocation: true
allowed-tools: Bash(node:*), Bash(git:*), Bash(mktemp:*), Bash(rm:*), Read, Glob, Grep
---

Run the same code review on multiple agents in parallel, then present a unified comparison.

Raw slash-command arguments:
`$ARGUMENTS`

Argument handling:
- `--agents <list>`: Comma-separated agents to run (codex, opencode, qoder). If omitted, all enabled agents will be used.
- `--base <ref>`: Diff base branch (default: `main`).

Execution (single Bash call — gather diff into a fresh mktemp file, run bridge, clean up):

```bash
TMPFILE=$(mktemp /tmp/uab-compare-XXXXXX) && git diff <base>...HEAD > "$TMPFILE" && node "${CLAUDE_PLUGIN_ROOT}/dist/bridge.js" --task compare --code-file "$TMPFILE" $ARGUMENTS; rc=$?; rm -f "$TMPFILE"; exit $rc
```

Rules:
- Use exactly one `Bash` invocation. Keep mktemp + git diff + bridge + rm chained so cleanup runs even on failure.
- Return the command stdout verbatim. Do not paraphrase, summarize, or add commentary.
