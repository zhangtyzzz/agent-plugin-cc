---
description: Use an external agent to explain code
argument-hint: '[--agent <name>] [--files <glob>]'
disable-model-invocation: true
allowed-tools: Bash(node:*), Read, Glob, Grep
---

Use an external AI agent to explain code step by step.

Raw slash-command arguments:
`$ARGUMENTS`

Execution:
1. Gather the code to explain (from --files or recent changes)
2. Write to temp file
3. Run:
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/dist/bridge.js" --task explain --code-file /tmp/uab-explain-input.txt $ARGUMENTS
   ```
4. Return the output verbatim.
5. Clean up temp file.
