---
description: Run a code review using an external AI agent
argument-hint: '[--wait|--background] [--base <ref>] [--agent <name>] [--focus <area>]'
disable-model-invocation: true
allowed-tools: Read, Glob, Grep, Bash(npx:*), Bash(git:*), AskUserQuestion
---

Run a code review through the Universal Agent Bridge.

Raw slash-command arguments:
`$ARGUMENTS`

Core constraint:
- This command is review-only.
- Do not fix issues, apply patches, or suggest that you are about to make changes.
- Your only job is to run the review and return the output verbatim to the user.

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
- `--agent <name>`: Route to a specific agent (codex, opencode, gemini, qoder). If omitted, auto-route based on config.
- `--base <ref>`: Diff base branch (default: main)
- `--focus <area>`: Focus area (security, performance, logic, style)
- Preserve the user's arguments exactly. Do not strip flags yourself.

Foreground flow:
1. Gather the code diff:
   ```bash
   git diff main > /tmp/uab-review-input.txt
   ```
2. Run:
   ```bash
   npx tsx "${CLAUDE_PLUGIN_ROOT}/scripts/bridge.ts" --task review --code-file /tmp/uab-review-input.txt $ARGUMENTS
   ```
3. Return the command stdout verbatim, exactly as-is.
4. Do not paraphrase, summarize, or add commentary before or after it.
5. Clean up: `rm -f /tmp/uab-review-input.txt`

Background flow:
- Launch the review with `Bash` in the background:
  ```typescript
  Bash({
    command: `git diff main > /tmp/uab-review-input.txt && npx tsx "${CLAUDE_PLUGIN_ROOT}/scripts/bridge.ts" --task review --code-file /tmp/uab-review-input.txt $ARGUMENTS && rm -f /tmp/uab-review-input.txt`,
    description: "Agent review",
    run_in_background: true
  })
  ```
- After launching, tell the user: "Agent review started in the background."
