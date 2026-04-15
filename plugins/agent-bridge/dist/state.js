// plugins/agent-bridge/scripts/state.ts
//
// Persistent per-workspace job state management.
// State directory: ~/.universal-agent-bridge/state/<basename>-<hash16>/
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync, } from "node:fs";
import { basename, join } from "node:path";
import { homedir } from "node:os";
const MAX_JOBS = 50;
// ---- ID generation ----
export function generateJobId(prefix = "task") {
    const ts = Date.now().toString(36);
    const rand = Math.random().toString(36).slice(2, 8);
    return `${prefix}-${ts}-${rand}`;
}
// ---- State directory ----
export function resolveStateDir(cwd) {
    const name = basename(cwd);
    const hash = createHash("sha256").update(cwd).digest("hex").slice(0, 16);
    const root = process.env.CLAUDE_PLUGIN_DATA ||
        join(homedir(), ".universal-agent-bridge", "state");
    const dir = join(root, `${name}-${hash}`);
    mkdirSync(join(dir, "jobs"), { recursive: true });
    return dir;
}
/** Resolve the log file path for a job. */
export function resolveJobLogFile(cwd, jobId) {
    return join(resolveStateDir(cwd), "jobs", `${jobId}.log`);
}
// ---- state.json helpers ----
function stateFilePath(stateDir) {
    return join(stateDir, "state.json");
}
function readState(stateDir) {
    const p = stateFilePath(stateDir);
    if (!existsSync(p))
        return { version: 1, config: { stopReviewGate: false }, jobs: [] };
    try {
        const data = JSON.parse(readFileSync(p, "utf-8"));
        // Migration: old format stored bare array
        if (Array.isArray(data))
            return { version: 1, config: { stopReviewGate: false }, jobs: data };
        return data;
    }
    catch {
        return { version: 1, config: { stopReviewGate: false }, jobs: [] };
    }
}
function writeState(stateDir, state) {
    writeFileSync(stateFilePath(stateDir), JSON.stringify(state, null, 2), "utf-8");
}
function readStateFile(stateDir) {
    return readState(stateDir).jobs;
}
function writeStateFile(stateDir, jobs) {
    const stateDir2 = stateDir; // avoid shadowing
    const state = readState(stateDir2);
    state.jobs = jobs;
    writeState(stateDir2, state);
}
// ---- Public API ----
/** Insert or update a job record. Prunes to MAX_JOBS (LRU by updatedAt). */
export function upsertJob(cwd, patch) {
    const stateDir = resolveStateDir(cwd);
    const jobs = readStateFile(stateDir);
    const now = new Date().toISOString();
    const idx = jobs.findIndex((j) => j.id === patch.id);
    let record;
    if (idx >= 0) {
        record = { ...jobs[idx], ...patch, updatedAt: now };
        jobs[idx] = record;
    }
    else {
        record = {
            kind: "task",
            title: "Agent Task",
            agent: "unknown",
            summary: "",
            status: "queued",
            phase: "queued",
            pid: null,
            logFile: "",
            createdAt: now,
            updatedAt: now,
            ...patch,
        };
        jobs.unshift(record);
    }
    // Prune oldest beyond MAX_JOBS
    const sorted = jobs.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    const pruned = sorted.slice(0, MAX_JOBS);
    writeStateFile(stateDir, pruned);
    return record;
}
/** List all job summaries, newest first. */
export function listJobs(cwd) {
    const stateDir = resolveStateDir(cwd);
    return readStateFile(stateDir);
}
/** Read full job detail from jobs/<jobId>.json. */
export function readJobFile(cwd, jobId) {
    const stateDir = resolveStateDir(cwd);
    const p = join(stateDir, "jobs", `${jobId}.json`);
    if (!existsSync(p))
        return null;
    try {
        return JSON.parse(readFileSync(p, "utf-8"));
    }
    catch {
        return null;
    }
}
/** Write full job detail to jobs/<jobId>.json. */
export function writeJobFile(cwd, jobId, data) {
    const stateDir = resolveStateDir(cwd);
    writeFileSync(join(stateDir, "jobs", `${jobId}.json`), JSON.stringify(data, null, 2), "utf-8");
}
/** Append a timestamped line to a job's log file. */
export function appendLogLine(logFile, line) {
    const ts = new Date().toISOString();
    appendFileSync(logFile, `[${ts}] ${line}\n`, "utf-8");
}
/** Prefix-match a job ID reference against a list of jobs. */
export function matchJobRef(jobs, ref) {
    // Exact match first
    const exact = jobs.find((j) => j.id === ref);
    if (exact)
        return exact;
    // Prefix match
    const matches = jobs.filter((j) => j.id.startsWith(ref));
    return matches.length === 1 ? matches[0] : undefined;
}
/** Read state-level config. */
export function getConfig(cwd) {
    const stateDir = resolveStateDir(cwd);
    return readState(stateDir).config;
}
/** Set a state-level config key. */
export function setConfig(cwd, key, value) {
    const stateDir = resolveStateDir(cwd);
    const state = readState(stateDir);
    state.config[key] = value;
    writeState(stateDir, state);
}
