---
description: Run the same task on multiple agents and compare results
argument-hint: '[--agents <list>] [--base <ref>]'
disable-model-invocation: true
allowed-tools: Bash(node:*), Bash(git:*), Read, Glob, Grep
---

Run the same code review on multiple agents in parallel, then present a unified comparison.

Raw slash-command arguments:
`$ARGUMENTS`

Execution:
1. Gather the code diff:
   ```bash
   git diff main > /tmp/uab-compare-input.txt
   ```
2. Run:
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/dist/bridge.js" --task compare --code-file /tmp/uab-compare-input.txt $ARGUMENTS
   ```
3. Return the output verbatim.
4. Clean up: `rm -f /tmp/uab-compare-input.txt`

If `--agents` is not specified, all enabled agents will be used.
