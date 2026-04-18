---
description: Use an external agent to explain code
argument-hint: '[--agent <name>] [code text or path]'
disable-model-invocation: true
allowed-tools: Bash(node:*), Read, Glob, Grep
---

Use an external AI agent to explain code step by step.

Raw slash-command arguments:
`$ARGUMENTS`

Argument handling:
- All arguments are passed through to bridge.js.
- bridge.js parses `--agent <name>` itself.
- Remaining positional words become the code/prompt to explain. If empty, bridge.js auto-collects `git diff HEAD`.

Execution (one Bash call):
```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/bridge.js" --task explain $ARGUMENTS
```

Rules:
- Use exactly one `Bash` invocation. Do not chain or wrap.
- Return the bridge stdout verbatim. No paraphrasing, no summarizing.
