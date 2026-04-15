// plugins/agent-bridge/scripts/state.ts
//
// Persistent per-workspace job state management.
// State directory: ~/.universal-agent-bridge/state/<basename>-<hash16>/

import { createHash, randomBytes } from "node:crypto";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  appendFileSync,
} from "node:fs";
import { basename, join } from "node:path";
import { homedir } from "node:os";

// ---- Types ----

export interface JobRecord {
  id: string;
  kind: string;
  title: string;
  agent: string;
  summary: string;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  phase: string;
  pid: number | null;
  logFile: string;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  result?: { agent: string; model?: string; result: string; latencyMs: number };
  errorMessage?: string;
  request?: object;
}

const MAX_JOBS = 50;
const SAFE_ID_RE = /^[a-zA-Z0-9_-]+$/;

/** Validate a job ID contains only safe characters (no path traversal). */
function validateJobId(jobId: string): void {
  if (!SAFE_ID_RE.test(jobId)) {
    throw new Error(`Invalid job ID: ${jobId}`);
  }
}

/** Write a file with restrictive permissions (0o600). */
function writeFileRestricted(path: string, data: string): void {
  writeFileSync(path, data, { encoding: "utf-8", mode: 0o600 });
}

// ---- ID generation ----

export function generateJobId(prefix = "task"): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${ts}-${rand}`;
}

// ---- State directory ----

export function resolveStateDir(cwd: string): string {
  const name = basename(cwd) || "root";
  const hash = createHash("sha256").update(cwd).digest("hex").slice(0, 16);
  const root =
    process.env.CLAUDE_PLUGIN_DATA ||
    join(homedir(), ".universal-agent-bridge", "state");
  const dir = join(root, `${name}-${hash}`);
  const jobsDir = join(dir, "jobs");
  mkdirSync(jobsDir, { recursive: true, mode: 0o700 });
  // Ensure restrictive permissions even if dir already existed
  try { chmodSync(dir, 0o700); } catch {}
  try { chmodSync(jobsDir, 0o700); } catch {}
  return dir;
}

/** Resolve the log file path for a job. */
export function resolveJobLogFile(cwd: string, jobId: string): string {
  validateJobId(jobId);
  return join(resolveStateDir(cwd), "jobs", `${jobId}.log`);
}

// ---- State config ----

export interface StateConfig {
  stopReviewGate: boolean;
}

interface StateFile {
  version: number;
  config: StateConfig;
  jobs: JobRecord[];
}

// ---- state.json helpers ----

function stateFilePath(stateDir: string): string {
  return join(stateDir, "state.json");
}

function readState(stateDir: string): StateFile {
  const p = stateFilePath(stateDir);
  if (!existsSync(p)) return { version: 1, config: { stopReviewGate: false }, jobs: [] };
  try {
    const data = JSON.parse(readFileSync(p, "utf-8"));
    // Migration: old format stored bare array
    if (Array.isArray(data)) return { version: 1, config: { stopReviewGate: false }, jobs: data };
    return data;
  } catch {
    return { version: 1, config: { stopReviewGate: false }, jobs: [] };
  }
}

function writeState(stateDir: string, state: StateFile): void {
  writeFileRestricted(stateFilePath(stateDir), JSON.stringify(state, null, 2));
}

function readStateFile(stateDir: string): JobRecord[] {
  return readState(stateDir).jobs;
}

function writeStateFile(stateDir: string, jobs: JobRecord[]): void {
  const stateDir2 = stateDir; // avoid shadowing
  const state = readState(stateDir2);
  state.jobs = jobs;
  writeState(stateDir2, state);
}

// ---- Public API ----

/** Insert or update a job record. Prunes to MAX_JOBS (LRU by updatedAt). */
export function upsertJob(
  cwd: string,
  patch: Partial<JobRecord> & { id: string },
): JobRecord {
  const stateDir = resolveStateDir(cwd);
  const jobs = readStateFile(stateDir);
  const now = new Date().toISOString();

  const idx = jobs.findIndex((j) => j.id === patch.id);
  let record: JobRecord;

  if (idx >= 0) {
    record = { ...jobs[idx], ...patch, updatedAt: now };
    jobs[idx] = record;
  } else {
    record = {
      kind: "task",
      title: "Agent Task",
      agent: "unknown",
      summary: "",
      status: "queued" as const,
      phase: "queued",
      pid: null,
      logFile: "",
      createdAt: now,
      updatedAt: now,
      ...patch,
    } as JobRecord;
    jobs.unshift(record);
  }

  // Prune oldest beyond MAX_JOBS
  const sorted = jobs.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
  const pruned = sorted.slice(0, MAX_JOBS);
  writeStateFile(stateDir, pruned);

  return record;
}

/** List all job summaries, newest first. */
export function listJobs(cwd: string): JobRecord[] {
  const stateDir = resolveStateDir(cwd);
  return readStateFile(stateDir);
}

/** Read full job detail from jobs/<jobId>.json. */
export function readJobFile(cwd: string, jobId: string): JobRecord | null {
  validateJobId(jobId);
  const stateDir = resolveStateDir(cwd);
  const p = join(stateDir, "jobs", `${jobId}.json`);
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf-8"));
  } catch {
    return null;
  }
}

/** Write full job detail to jobs/<jobId>.json. */
export function writeJobFile(cwd: string, jobId: string, data: JobRecord): void {
  validateJobId(jobId);
  const stateDir = resolveStateDir(cwd);
  writeFileRestricted(
    join(stateDir, "jobs", `${jobId}.json`),
    JSON.stringify(data, null, 2),
  );
}

/** Append a timestamped line to a job's log file. */
export function appendLogLine(logFile: string, line: string): void {
  const ts = new Date().toISOString();
  const sanitized = line.replace(/[\r\n]/g, " ");
  appendFileSync(logFile, `[${ts}] ${sanitized}\n`, { encoding: "utf-8", mode: 0o600 });
}

/** Prefix-match a job ID reference against a list of jobs. */
export function matchJobRef(
  jobs: JobRecord[],
  ref: string,
): JobRecord | undefined {
  // Exact match first
  const exact = jobs.find((j) => j.id === ref);
  if (exact) return exact;
  // Prefix match
  const matches = jobs.filter((j) => j.id.startsWith(ref));
  return matches.length === 1 ? matches[0] : undefined;
}

/** Read state-level config. */
export function getConfig(cwd: string): StateConfig {
  const stateDir = resolveStateDir(cwd);
  return readState(stateDir).config;
}

/** Set a state-level config key. */
export function setConfig<K extends keyof StateConfig>(
  cwd: string,
  key: K,
  value: StateConfig[K],
): void {
  const stateDir = resolveStateDir(cwd);
  const state = readState(stateDir);
  state.config[key] = value;
  writeState(stateDir, state);
}
