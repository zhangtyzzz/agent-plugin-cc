import { describe, it } from "node:test";
import assert from "node:assert/strict";

const { BaseAdapter } = await import("../plugins/agent-bridge/dist/adapters/base.js");

// Concrete test adapter to exercise base class methods
class TestAdapter extends BaseAdapter {
  config = {
    name: "test",
    displayName: "Test Adapter",
    cliBinary: "echo",
    authEnvVar: "",
    capabilities: ["review"],
    strengths: ["testing"],
  };

  async healthCheck() {
    return { ok: true, version: "1.0" };
  }

  async execute(task) {
    const prompt = this.buildReviewPrompt(task);
    return { agent: "test", result: prompt, latencyMs: 0 };
  }

  // Expose protected methods for testing
  async testRunCli(binary, args, timeout) {
    return this.runCli(binary, args, timeout);
  }

  async testCliExists(binary) {
    return this.cliExists(binary);
  }

  testBuildReviewPrompt(task) {
    return this.buildReviewPrompt(task);
  }
}

describe("BaseAdapter", () => {
  const adapter = new TestAdapter();

  describe("buildReviewPrompt", () => {
    it("builds review prompt with code", () => {
      const prompt = adapter.testBuildReviewPrompt({
        type: "review",
        code: "const x = 1;",
      });
      assert.ok(prompt.includes("const x = 1;"));
      assert.ok(prompt.includes("Review"));
    });

    it("builds adversarial-review prompt", () => {
      const prompt = adapter.testBuildReviewPrompt({
        type: "adversarial-review",
        code: "fn()",
      });
      assert.ok(prompt.includes("Adversarial"));
      assert.ok(prompt.includes("fn()"));
    });

    it("builds task prompt as raw passthrough", () => {
      const prompt = adapter.testBuildReviewPrompt({
        type: "task",
        code: "create a hello world app",
      });
      assert.equal(prompt, "create a hello world app");
    });

    it("task prompt returns empty string when no code", () => {
      const prompt = adapter.testBuildReviewPrompt({
        type: "task",
        code: "",
      });
      assert.equal(prompt, "");
    });

    it("builds explain prompt", () => {
      const prompt = adapter.testBuildReviewPrompt({
        type: "explain",
        code: "x = 1",
      });
      assert.ok(prompt.includes("Explain"));
    });

    it("unknown type falls back to raw code", () => {
      const prompt = adapter.testBuildReviewPrompt({
        type: "unknown",
        code: "raw content",
      });
      assert.equal(prompt, "raw content");
    });

    it("includes focus when specified", () => {
      const prompt = adapter.testBuildReviewPrompt({
        type: "review",
        code: "x",
        focus: "security",
      });
      assert.ok(prompt.includes("Focus specifically on: security"));
    });

    it("includes language when specified", () => {
      const prompt = adapter.testBuildReviewPrompt({
        type: "review",
        code: "x",
        language: "python",
      });
      assert.ok(prompt.includes("Language: python"));
    });
  });

  describe("runCli", () => {
    it("runs a simple command and returns stdout", async () => {
      const result = await adapter.testRunCli("echo", ["hello world"], 5000);
      assert.equal(result.trim(), "hello world");
    });

    it("handles shell-special characters in arguments", async () => {
      const result = await adapter.testRunCli("echo", ["hello'world"], 5000);
      assert.equal(result.trim(), "hello'world");
    });

    it("rejects on non-existent binary", async () => {
      await assert.rejects(
        () => adapter.testRunCli("nonexistent_binary_xyz", ["arg"], 5000),
        (err) => err.message.includes("nonexistent_binary_xyz")
      );
    });
  });

  describe("cliExists", () => {
    it("returns true for existing binary", async () => {
      const exists = await adapter.testCliExists("echo");
      assert.equal(exists, true);
    });

    it("returns false for non-existent binary", async () => {
      const exists = await adapter.testCliExists("nonexistent_xyz_binary");
      assert.equal(exists, false);
    });
  });
});
