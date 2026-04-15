---
description: Run an adversarial code review that challenges implementation and finds vulnerabilities
argument-hint: '[--wait|--background] [--base <ref>] [--agent <name>] [--focus <area>] [focus text ...]'
disable-model-invocation: true
allowed-tools: Read, Glob, Grep, Bash(node:*), Bash(git:*), AskUserQuestion
---

Run an adversarial code review through the Universal Agent Bridge.
Position it as a challenge review that questions the chosen implementation, design choices, tradeoffs, and assumptions.

Raw slash-command arguments:
`$ARGUMENTS`

Core constraint:
- This command is review-only.
- Do not fix issues, apply patches, or suggest that you are about to make changes.
- Your only job is to run the review and return the output verbatim to the user.

Execution mode rules:
- If the raw arguments include `--wait`, do not ask. Run in the foreground.
- If the raw arguments include `--background`, do not ask. Run in a Claude background task.
- Otherwise, estimate the review size and use `AskUserQuestion` exactly once with:
  - `Wait for results` / `Run in background`

Argument handling:
- `--agent <name>`: Route to a specific agent. If omitted, auto-route.
- `--base <ref>`: Diff base branch (default: main)
- `--focus <area>`: Focus area (race-conditions, injection, auth, overflow)
- Extra positional text is passed as focus text.

Foreground flow:
1. Gather the code diff:
   ```bash
   git diff main > /tmp/uab-review-input.txt
   ```
2. Run:
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/dist/bridge.js" --task adversarial-review --code-file /tmp/uab-review-input.txt $ARGUMENTS
   ```
3. Return the command stdout verbatim.
4. Clean up: `rm -f /tmp/uab-review-input.txt`

Background flow:
- Launch with `Bash` in the background, then tell the user it's running.
