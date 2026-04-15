// plugins/agent-bridge/scripts/stop-review-gate.ts
//
// Standalone hook script for the Stop review gate.
// Reads JSON from stdin, runs a review via bridge.js, emits BLOCK/ALLOW decision.

import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

import { getConfig, listJobs, matchJobRef } from "./state.js";

const STOP_REVIEW_TIMEOUT_MS = 15 * 60 * 1000;
const __filename = fileURLToPath(import.meta.url);
const SCRIPT_DIR = dirname(__filename);

interface HookInput {
  cwd?: string;
  session_id?: string;
  last_assistant_message?: string;
}

function readHookInput(): HookInput {
  try {
    const raw = readFileSync(0, "utf8").trim();
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function emitDecision(payload: { decision: string; reason: string }): void {
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}

function logNote(message: string | null): void {
  if (message) process.stderr.write(`${message}\n`);
}

function parseStopReviewOutput(rawOutput: string): { ok: boolean; reason: string | null } {
  const text = String(rawOutput ?? "").trim();
  if (!text) {
    return { ok: false, reason: "The stop-time review returned no output. Run /agent:review --wait manually or bypass the gate." };
  }

  // Search all lines for ALLOW:/BLOCK: since bridge.ts prepends headers
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("ALLOW:")) return { ok: true, reason: null };
    if (trimmed.startsWith("BLOCK:")) {
      const reason = trimmed.slice("BLOCK:".length).trim() || text;
      return { ok: false, reason: `Stop-time review found issues: ${reason}` };
    }
  }

  // No explicit verdict found — default to allow (don't block on format issues)
  return { ok: true, reason: null };
}

function runStopReview(cwd: string, input: HookInput): { ok: boolean; reason: string | null } {
  const lastMessage = String(input.last_assistant_message ?? "").trim();
  if (!lastMessage) return { ok: true, reason: null };

  // Write the last assistant message to a temp file for review
  const tmpFile = join(tmpdir(), `uab-stop-review-${randomBytes(8).toString("hex")}.txt`);
  try {
    const prompt = [
      "Review the following Claude response for correctness and safety.",
      "Output ALLOW: <reason> if the response is acceptable, or BLOCK: <reason> if issues were found.",
      "",
      "Previous Claude response:",
      lastMessage,
    ].join("\n");
    writeFileSync(tmpFile, prompt, { encoding: "utf-8", mode: 0o600 });

    const scriptPath = join(SCRIPT_DIR, "bridge.js");
    const result = spawnSync(process.execPath, [scriptPath, "--task", "review", "--code-file", tmpFile, "--cwd", cwd], {
      cwd,
      env: process.env,
      encoding: "utf8",
      timeout: STOP_REVIEW_TIMEOUT_MS,
    });

    if ((result.error as any)?.code === "ETIMEDOUT") {
      return { ok: false, reason: "The stop-time review timed out after 15 minutes. Run /agent:review --wait manually or bypass the gate." };
    }

    if (result.status !== 0) {
      const detail = String(result.stderr || result.stdout || "").trim();
      return { ok: false, reason: detail ? `Stop-time review failed: ${detail}` : "Stop-time review failed." };
    }

    return parseStopReviewOutput(result.stdout);
  } finally {
    try { unlinkSync(tmpFile); } catch {}
  }
}

function main(): void {
  const input = readHookInput();
  const cwd = input.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const config = getConfig(cwd);

  // Check for running jobs and warn
  const jobs = listJobs(cwd);
  const runningJob = jobs.find((j) => j.status === "queued" || j.status === "running");
  const runningNote = runningJob
    ? `Agent task ${runningJob.id} is still running. Check /agent:status and use /agent:cancel ${runningJob.id} if needed.`
    : null;

  if (!config.stopReviewGate) {
    logNote(runningNote);
    return;
  }

  const review = runStopReview(cwd, input);
  if (!review.ok) {
    const reason = runningNote ? `${runningNote} ${review.reason}` : (review.reason || "Review blocked.");
    emitDecision({ decision: "block", reason });
    return;
  }

  // Emit explicit allow for protocol clarity
  emitDecision({ decision: "allow", reason: review.reason || "Stop-time review passed" });
  logNote(runningNote);
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
}
