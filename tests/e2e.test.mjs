import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { writeFileSync, unlinkSync, existsSync } from "node:fs";
import { join } from "node:path";

const bridgePath = join(process.cwd(), "plugins/agent-bridge/dist/bridge.js");

function run(args, opts = {}) {
  return execSync(`node ${bridgePath} ${args}`, {
    encoding: "utf-8",
    timeout: 10000,
    env: { ...process.env },
    ...opts,
  });
}

describe("E2E: bridge CLI", () => {
  describe("--task list", () => {
    it("outputs available agents table", () => {
      const output = run("--task list");
      assert.ok(output.includes("Available Agents"));
      assert.ok(output.includes("codex") || output.includes("Codex"));
    });
  });

  describe("--task health", () => {
    it("outputs health check table", () => {
      const output = run("--task health");
      assert.ok(output.includes("Agent Health Check"));
      assert.ok(output.includes("Agent"));
      assert.ok(output.includes("Status"));
    });
  });

  describe("missing --task", () => {
    it("exits with error when --task is not provided", () => {
      assert.throws(
        () => run(""),
        (err) => err.status !== 0
      );
    });
  });

  describe("invalid task", () => {
    it("exits with error for unknown task", () => {
      assert.throws(
        () => run("--task invalid_task_xyz"),
        (err) => {
          const stderr = err.stderr?.toString() || "";
          return stderr.includes("unknown task") || err.status !== 0;
        }
      );
    });
  });

  describe("--task review without code", () => {
    it("exits with error when --code-file is missing", () => {
      assert.throws(
        () => run("--task review"),
        (err) => {
          const stderr = err.stderr?.toString() || "";
          return stderr.includes("--code-file") || err.status !== 0;
        }
      );
    });
  });

  describe("--task review with empty code file", () => {
    const tmpFile = "/tmp/uab-test-empty.txt";
    it("exits with error when code file is empty", () => {
      writeFileSync(tmpFile, "");
      try {
        assert.throws(
          () => run(`--task review --code-file ${tmpFile}`),
          (err) => err.status !== 0
        );
      } finally {
        try { unlinkSync(tmpFile); } catch {}
      }
    });
  });

  describe("--task compare without enough agents", () => {
    it("exits with error when --agents has only one agent", () => {
      const tmpFile = "/tmp/uab-test-compare.txt";
      writeFileSync(tmpFile, "function x() {}");
      try {
        assert.throws(
          () => run(`--task compare --agents codex --code-file ${tmpFile}`),
          (err) => {
            const stderr = err.stderr?.toString() || "";
            return stderr.includes("at least 2") || err.status !== 0;
          }
        );
      } finally {
        try { unlinkSync(tmpFile); } catch {}
      }
    });
  });

  describe("--task status", () => {
    it("outputs job status table (even empty)", () => {
      const output = run("--task status");
      assert.ok(output.includes("Agent Jobs") || output.includes("No jobs found"));
    });
  });

  describe("--task result without job-id", () => {
    it("exits with error when --job-id is missing", () => {
      assert.throws(
        () => run("--task result"),
        (err) => {
          const stderr = err.stderr?.toString() || "";
          return stderr.includes("--job-id") || err.status !== 0;
        }
      );
    });
  });

  describe("--task cancel without job-id", () => {
    it("exits with error when --job-id is missing", () => {
      assert.throws(
        () => run("--task cancel"),
        (err) => {
          const stderr = err.stderr?.toString() || "";
          return stderr.includes("--job-id") || err.status !== 0;
        }
      );
    });
  });

  describe("--task result with nonexistent job", () => {
    it("exits with error for unknown job", () => {
      assert.throws(
        () => run("--task result --job-id nonexistent-job-12345"),
        (err) => {
          const stderr = err.stderr?.toString() || "";
          return stderr.includes("not found") || err.status !== 0;
        }
      );
    });
  });

  describe("--task cancel with nonexistent job", () => {
    it("exits with error for unknown job", () => {
      assert.throws(
        () => run("--task cancel --job-id nonexistent-job-12345"),
        (err) => {
          const stderr = err.stderr?.toString() || "";
          return stderr.includes("not found") || err.status !== 0;
        }
      );
    });
  });
});
