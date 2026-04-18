---
description: Run a code review using an external AI agent
argument-hint: '[--wait|--background] [--base <ref>] [--agent <name>] [--focus <area>] [--scope auto|working-tree|branch]'
disable-model-invocation: true
allowed-tools: Read, Glob, Grep, Bash(node:*), Bash(git:*), AskUserQuestion
---

Run a code review through the Universal Agent Bridge.

Raw slash-command arguments:
`$ARGUMENTS`

Core constraint:
- This command is review-only.
- Do not fix issues, apply patches, or suggest that you are about to make changes.
- Your only job is to run the review and return the bridge's output verbatim.

Execution mode rules:
- If the raw arguments include `--wait`, do not ask. Run the review in the foreground.
- If the raw arguments include `--background`, do not ask. Run the review in a Claude background task.
- Otherwise, estimate the review size before asking:
  - For working-tree review, start with `git status --short --untracked-files=all`.
  - Also inspect both `git diff --shortstat --cached` and `git diff --shortstat`.
  - For base-branch review, use `git diff --shortstat <base>...HEAD`.
  - Recommend waiting only when the review is clearly tiny, roughly 1-2 files.
  - In every other case, recommend background.
- Then use `AskUserQuestion` exactly once with two options, putting the recommended option first and suffixing its label with `(Recommended)`:
  - `Wait for results`
  - `Run in background`

Argument handling:
- All arguments are passed through to bridge.js as-is.
- bridge.js parses `--agent <name>`, `--base <ref>`, `--focus <area>`, `--scope <mode>`, `--background` itself and auto-collects the git diff based on `--scope`.
  - `auto` (default): working-tree if dirty, otherwise branch diff against `--base` (default `main`).
  - `working-tree`: `git diff HEAD`.
  - `branch`: `git diff <base>...HEAD`.

Foreground flow (one Bash call):
```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/bridge.js" --task review $ARGUMENTS
```

Background flow:
```typescript
Bash({
  command: `node "${CLAUDE_PLUGIN_ROOT}/dist/bridge.js" --task review $ARGUMENTS`,
  description: "Agent review",
  run_in_background: true
})
```
After launching, tell the user the review started in the background.

Rules:
- Use exactly one `Bash` invocation. Do not chain or wrap.
- Return the bridge stdout verbatim. No paraphrasing, no summarizing.
