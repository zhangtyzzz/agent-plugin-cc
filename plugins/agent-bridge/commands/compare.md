---
description: Run the same task on multiple agents and compare results
argument-hint: '[--agents <list>] [--base <ref>] [--scope auto|working-tree|branch]'
disable-model-invocation: true
allowed-tools: Bash(node:*), Read, Glob, Grep
---

Run the same code review on multiple agents in parallel, then present a unified comparison.

Raw slash-command arguments:
`$ARGUMENTS`

Argument handling:
- All arguments are passed through to bridge.js.
- bridge.js parses `--agents <list>`, `--base <ref>`, `--scope <mode>` itself, and auto-collects the git diff.
- If `--agents` is not specified, all enabled agents will be used.

Execution (one Bash call):
```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/bridge.js" --task compare $ARGUMENTS
```

Rules:
- Use exactly one `Bash` invocation. Do not chain or wrap.
- Return the bridge stdout verbatim. No paraphrasing, no summarizing.
