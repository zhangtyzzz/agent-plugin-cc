import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, rmSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// We test by importing the compiled JS
const statePath = join(process.cwd(), "plugins/agent-bridge/dist/state.js");

// Dynamic import since we need ESM
const {
  generateJobId,
  resolveStateDir,
  upsertJob,
  listJobs,
  readJobFile,
  writeJobFile,
  appendLogLine,
  matchJobRef,
  resolveJobLogFile,
  getConfig,
  setConfig,
} = await import(statePath);

// Use a unique temp workspace per test run to avoid collisions
const testWorkspace = join(tmpdir(), `uab-state-test-${Date.now()}`);

describe("state.ts", () => {
  beforeEach(() => {
    mkdirSync(testWorkspace, { recursive: true });
    // Override env to use temp dir for state
    process.env.CLAUDE_PLUGIN_DATA = join(tmpdir(), `uab-state-data-${Date.now()}`);
  });

  afterEach(() => {
    try { rmSync(testWorkspace, { recursive: true, force: true }); } catch {}
    const dataDir = process.env.CLAUDE_PLUGIN_DATA;
    if (dataDir) {
      try { rmSync(dataDir, { recursive: true, force: true }); } catch {}
    }
    delete process.env.CLAUDE_PLUGIN_DATA;
  });

  describe("generateJobId", () => {
    it("produces unique IDs with prefix", () => {
      const id1 = generateJobId("task");
      const id2 = generateJobId("task");
      assert.ok(id1.startsWith("task-"));
      assert.ok(id2.startsWith("task-"));
      assert.notEqual(id1, id2);
    });

    it("uses default prefix", () => {
      const id = generateJobId();
      assert.ok(id.startsWith("task-"));
    });
  });

  describe("resolveStateDir", () => {
    it("creates workspace-scoped directory", () => {
      const dir = resolveStateDir(testWorkspace);
      assert.ok(existsSync(dir));
      assert.ok(existsSync(join(dir, "jobs")));
    });

    it("returns same dir for same cwd", () => {
      const dir1 = resolveStateDir(testWorkspace);
      const dir2 = resolveStateDir(testWorkspace);
      assert.equal(dir1, dir2);
    });

    it("returns different dir for different cwd", () => {
      const dir1 = resolveStateDir(testWorkspace);
      const dir2 = resolveStateDir(testWorkspace + "-other");
      assert.notEqual(dir1, dir2);
    });
  });

  describe("upsertJob + listJobs", () => {
    it("creates a new job", () => {
      const job = upsertJob(testWorkspace, { id: "test-001", kind: "review", agent: "codex" });
      assert.equal(job.id, "test-001");
      assert.equal(job.kind, "review");
      assert.equal(job.status, "queued");

      const jobs = listJobs(testWorkspace);
      assert.equal(jobs.length, 1);
      assert.equal(jobs[0].id, "test-001");
    });

    it("updates an existing job", () => {
      upsertJob(testWorkspace, { id: "test-002", kind: "task", agent: "codex" });
      const updated = upsertJob(testWorkspace, { id: "test-002", status: "running", phase: "running" });
      assert.equal(updated.status, "running");

      const jobs = listJobs(testWorkspace);
      assert.equal(jobs.length, 1);
      assert.equal(jobs[0].status, "running");
    });

    it("prunes to 50 jobs", () => {
      for (let i = 0; i < 55; i++) {
        upsertJob(testWorkspace, { id: `prune-${i}`, agent: "codex" });
      }
      const jobs = listJobs(testWorkspace);
      assert.ok(jobs.length <= 50);
    });
  });

  describe("readJobFile + writeJobFile", () => {
    it("writes and reads a job file", () => {
      const record = {
        id: "file-001", kind: "review", title: "Test", agent: "codex",
        summary: "test", status: "completed", phase: "done",
        pid: null, logFile: "", createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(), result: { agent: "codex", result: "ok", latencyMs: 100 },
      };
      writeJobFile(testWorkspace, "file-001", record);
      const read = readJobFile(testWorkspace, "file-001");
      assert.ok(read);
      assert.equal(read.id, "file-001");
      assert.equal(read.result.result, "ok");
    });

    it("returns null for non-existent job", () => {
      const result = readJobFile(testWorkspace, "nonexistent");
      assert.equal(result, null);
    });
  });

  describe("matchJobRef", () => {
    it("matches exact ID", () => {
      const jobs = [
        { id: "task-abc123", kind: "review" },
        { id: "task-def456", kind: "task" },
      ];
      const match = matchJobRef(jobs, "task-abc123");
      assert.ok(match);
      assert.equal(match.id, "task-abc123");
    });

    it("matches prefix", () => {
      const jobs = [
        { id: "task-abc123", kind: "review" },
        { id: "task-def456", kind: "task" },
      ];
      const match = matchJobRef(jobs, "task-abc");
      assert.ok(match);
      assert.equal(match.id, "task-abc123");
    });

    it("returns undefined for ambiguous prefix", () => {
      const jobs = [
        { id: "task-abc123", kind: "review" },
        { id: "task-abc456", kind: "task" },
      ];
      const match = matchJobRef(jobs, "task-abc");
      assert.equal(match, undefined);
    });
  });

  describe("appendLogLine", () => {
    it("appends timestamped lines", () => {
      const logFile = resolveJobLogFile(testWorkspace, "log-test");
      appendLogLine(logFile, "Line one");
      appendLogLine(logFile, "Line two");
      const content = readFileSync(logFile, "utf-8");
      assert.ok(content.includes("Line one"));
      assert.ok(content.includes("Line two"));
      assert.ok(content.includes("["));
    });
  });

  describe("config", () => {
    it("reads default config", () => {
      const cfg = getConfig(testWorkspace);
      assert.equal(cfg.stopReviewGate, false);
    });

    it("sets and reads config", () => {
      setConfig(testWorkspace, "stopReviewGate", true);
      const cfg = getConfig(testWorkspace);
      assert.equal(cfg.stopReviewGate, true);
    });
  });
});
