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
- `--agent <name>`: Route to a specific agent (codex, opencode, qoder). If omitted, auto-route based on config.
- `--base <ref>`: Diff base branch (default: main)
- `--focus <area>`: Focus area (security, performance, logic, style)
- `--scope auto|working-tree|branch`: What to review (default: auto)
  - `auto`: If there are uncommitted changes, review the working tree diff. Otherwise, review the branch diff against base.
  - `working-tree`: `git diff HEAD` (staged + unstaged changes only)
  - `branch`: `git diff <base>...HEAD` (all commits on the branch)
- Preserve the user's arguments exactly. Do not strip flags yourself.

Scope-aware diff gathering:
1. Determine the scope (default: `auto`):
   - If `--scope working-tree`: use `git diff HEAD` (combine staged + unstaged)
   - If `--scope branch`: use `git diff <base>...HEAD` where base defaults to `main`
   - If `--scope auto` or no `--scope`:
     - Run `git diff --shortstat` and `git diff --shortstat --cached`
     - If there are any uncommitted changes, use working-tree mode: `git diff HEAD`
     - Otherwise, use branch mode: `git diff <base>...HEAD`
2. Write the diff to a unique temp file: `/tmp/uab-review-input-$RANDOM.txt` (use `mktemp` or `$RANDOM` to avoid collisions with concurrent reviews)

Foreground flow:
1. Gather the code diff using scope rules above into a unique temp file (e.g., `TMPFILE=$(mktemp /tmp/uab-review-XXXXXX)`)
2. Run:
   ```bash
   TMPFILE=$(mktemp /tmp/uab-review-XXXXXX) && <diff-command> > "$TMPFILE" && node "${CLAUDE_PLUGIN_ROOT}/dist/bridge.js" --task review --code-file "$TMPFILE" $ARGUMENTS; rm -f "$TMPFILE"
   ```
3. Return the command stdout verbatim, exactly as-is.
4. Do not paraphrase, summarize, or add commentary before or after it.

Background flow:
- Launch the review with `Bash` in the background:
  ```typescript
  Bash({
    command: `TMPFILE=$(mktemp /tmp/uab-review-XXXXXX) && <diff-command> > "$TMPFILE" && node "${CLAUDE_PLUGIN_ROOT}/dist/bridge.js" --task review --code-file "$TMPFILE" $ARGUMENTS; rm -f "$TMPFILE"`,
    description: "Agent review",
    run_in_background: true
  })
  ```
- After launching, tell the user: "Agent review started in the background."
