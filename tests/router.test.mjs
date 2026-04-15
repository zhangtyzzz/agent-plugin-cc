import { describe, it } from "node:test";
import assert from "node:assert/strict";

const { Router } = await import("../plugins/agent-bridge/dist/router.js");

// Minimal mock adapters
function mockAdapter(name, capabilities, strengths, healthy = true, cost = undefined) {
  return {
    config: {
      name,
      displayName: name,
      cliBinary: name,
      authEnvVar: "",
      capabilities,
      strengths,
      costPer1kTokens: cost,
    },
    healthCheck: async () => ({ ok: healthy }),
    execute: async () => ({ agent: name, result: "mock", latencyMs: 0 }),
  };
}

describe("Router", () => {
  describe("rule matching", () => {
    it("matches a routing rule by task type", async () => {
      const adapters = new Map([
        ["agentA", mockAdapter("agentA", ["review"], ["python"])],
        ["agentB", mockAdapter("agentB", ["review"], ["security"])],
      ]);
      const rules = [
        { match: { taskType: "review" }, routeTo: "agentA", reason: "test rule" },
      ];
      const router = new Router(adapters, rules, []);
      const result = await router.select({ type: "review", code: "x" });
      assert.equal(result.agent, "agentA");
      assert.equal(result.reason, "test rule");
    });

    it("matches rule by task type + language (case insensitive)", async () => {
      const adapters = new Map([
        ["pyAgent", mockAdapter("pyAgent", ["review"], ["python"])],
        ["jsAgent", mockAdapter("jsAgent", ["review"], ["javascript"])],
      ]);
      const rules = [
        { match: { taskType: "review", language: "Python" }, routeTo: "pyAgent", reason: "python rule" },
      ];
      const router = new Router(adapters, rules, []);
      const result = await router.select({ type: "review", code: "x", language: "python" });
      assert.equal(result.agent, "pyAgent");
    });

    it("skips unhealthy rule targets and falls through to scoring", async () => {
      const adapters = new Map([
        ["sick", mockAdapter("sick", ["review"], ["security"], false)],
        ["healthy", mockAdapter("healthy", ["review"], ["security"])],
      ]);
      const rules = [
        { match: { taskType: "review" }, routeTo: "sick", reason: "should skip" },
      ];
      const router = new Router(adapters, rules, []);
      const result = await router.select({ type: "review", code: "x" });
      assert.equal(result.agent, "healthy");
    });
  });

  describe("scoring", () => {
    it("prefers agent with matching focus strength", async () => {
      const adapters = new Map([
        ["secAgent", mockAdapter("secAgent", ["review"], ["security"])],
        ["genAgent", mockAdapter("genAgent", ["review"], ["general"])],
      ]);
      const router = new Router(adapters, [], []);
      const result = await router.select({ type: "review", code: "x", focus: "security" });
      assert.equal(result.agent, "secAgent");
    });

    it("prefers free agent over paid when no other differentiator", async () => {
      const adapters = new Map([
        ["paid", mockAdapter("paid", ["review"], [], true, { input: 0.01, output: 0.03 })],
        ["free", mockAdapter("free", ["review"], [], true, undefined)],
      ]);
      const router = new Router(adapters, [], []);
      const result = await router.select({ type: "review", code: "x" });
      assert.equal(result.agent, "free");
    });

    it("skips agents without matching capability", async () => {
      const adapters = new Map([
        ["reviewOnly", mockAdapter("reviewOnly", ["review"], ["security"])],
        ["rescueOnly", mockAdapter("rescueOnly", ["rescue"], ["security"])],
      ]);
      const router = new Router(adapters, [], ["reviewOnly"]);
      const result = await router.select({ type: "rescue", code: "x" });
      assert.equal(result.agent, "rescueOnly");
    });
  });

  describe("fallback chain", () => {
    it("uses fallback when no rules match and no scoring candidates", async () => {
      const adapters = new Map([
        ["fb", mockAdapter("fb", ["review"], [])],
      ]);
      // rules that won't match
      const rules = [
        { match: { taskType: "explain" }, routeTo: "nonexistent", reason: "nope" },
      ];
      const router = new Router(adapters, rules, ["fb"]);
      const result = await router.select({ type: "review", code: "x" });
      assert.equal(result.agent, "fb");
    });

    it("throws when no agent is available", async () => {
      const adapters = new Map([
        ["dead", mockAdapter("dead", ["review"], [], false)],
      ]);
      const router = new Router(adapters, [], ["dead"]);
      await assert.rejects(
        () => router.select({ type: "review", code: "x" }),
        { message: "No available agent" }
      );
    });
  });

  describe("keyword matching", () => {
    it("matches keyword in code content", async () => {
      const adapters = new Map([
        ["sqlAgent", mockAdapter("sqlAgent", ["review"], ["sql"])],
        ["genAgent", mockAdapter("genAgent", ["review"], ["general"])],
      ]);
      const rules = [
        { match: { keyword: "SELECT" }, routeTo: "sqlAgent", reason: "SQL detected" },
      ];
      const router = new Router(adapters, rules, []);
      const result = await router.select({ type: "review", code: "SELECT * FROM users" });
      assert.equal(result.agent, "sqlAgent");
      assert.equal(result.reason, "SQL detected");
    });

    it("keyword matching is case insensitive", async () => {
      const adapters = new Map([
        ["sqlAgent", mockAdapter("sqlAgent", ["review"], ["sql"])],
      ]);
      const rules = [
        { match: { keyword: "select" }, routeTo: "sqlAgent", reason: "SQL" },
      ];
      const router = new Router(adapters, rules, []);
      const result = await router.select({ type: "review", code: "SELECT * FROM users" });
      assert.equal(result.agent, "sqlAgent");
    });
  });
});
