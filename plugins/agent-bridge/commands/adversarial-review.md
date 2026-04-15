---
description: Run an adversarial code review that challenges implementation and finds vulnerabilities
argument-hint: '[--wait|--background] [--base <ref>] [--agent <name>] [--focus <area>] [--scope auto|working-tree|branch] [focus text ...]'
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
- `--scope auto|working-tree|branch`: What to review (default: auto)
  - `auto`: If there are uncommitted changes, review the working tree diff. Otherwise, review the branch diff against base.
  - `working-tree`: `git diff HEAD` (staged + unstaged changes only)
  - `branch`: `git diff <base>...HEAD` (all commits on the branch)
- Extra positional text is passed as focus text.

Scope-aware diff gathering:
1. Determine the scope (default: `auto`):
   - If `--scope working-tree`: use `git diff HEAD` (combine staged + unstaged)
   - If `--scope branch`: use `git diff <base>...HEAD` where base defaults to `main`
   - If `--scope auto` or no `--scope`:
     - Run `git diff --shortstat` and `git diff --shortstat --cached`
     - If there are any uncommitted changes, use working-tree mode: `git diff HEAD`
     - Otherwise, use branch mode: `git diff <base>...HEAD`
2. Write the diff to a unique temp file (use `mktemp` to avoid collisions with concurrent reviews)

Foreground flow:
1. Gather the code diff using scope rules above into a unique temp file (e.g., `TMPFILE=$(mktemp /tmp/uab-review-XXXXXX.txt)`)
2. Run:
   ```bash
   TMPFILE=$(mktemp /tmp/uab-review-XXXXXX.txt) && <diff-command> > "$TMPFILE" && node "${CLAUDE_PLUGIN_ROOT}/dist/bridge.js" --task adversarial-review --code-file "$TMPFILE" $ARGUMENTS; rm -f "$TMPFILE"
   ```
3. Return the command stdout verbatim.

Background flow:
- Launch with `Bash` in the background using a unique temp file, then tell the user it's running.
