import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

// Import compiled config module
const { loadConfig } = await import("../plugins/agent-bridge/dist/config.js");

describe("loadConfig", () => {
  it("loads default config and returns required fields", () => {
    const config = loadConfig();
    assert.ok(config.bridge, "config.bridge must exist");
    assert.ok(config.agents, "config.agents must exist");
    assert.ok(Array.isArray(config.routing_rules), "routing_rules must be array");
    assert.ok(Array.isArray(config.fallback_chain), "fallback_chain must be array");
  });

  it("has a default_strategy in bridge section", () => {
    const config = loadConfig();
    assert.equal(config.bridge.default_strategy, "best_fit");
  });

  it("has at least one agent defined", () => {
    const config = loadConfig();
    const agentNames = Object.keys(config.agents);
    assert.ok(agentNames.length > 0, "at least one agent must be defined");
  });

  it("each agent has enabled field", () => {
    const config = loadConfig();
    for (const [name, agent] of Object.entries(config.agents)) {
      assert.equal(typeof agent.enabled, "boolean", `${name}.enabled must be boolean`);
    }
  });

  it("fallback_chain does not contain ollama", () => {
    const config = loadConfig();
    assert.ok(
      !config.fallback_chain.includes("ollama"),
      "fallback_chain should not contain ollama"
    );
  });

  it("merges project-level config over defaults", () => {
    const projectConfigDir = join(process.cwd(), ".universal-agent-bridge");
    const projectConfigFile = join(projectConfigDir, "config.json");
    const hadDir = existsSync(projectConfigDir);

    try {
      mkdirSync(projectConfigDir, { recursive: true });
      writeFileSync(projectConfigFile, JSON.stringify({
        bridge: { cost_limit_usd_per_day: 99.99 }
      }));
      const config = loadConfig();
      assert.equal(config.bridge.cost_limit_usd_per_day, 99.99);
    } finally {
      try { rmSync(projectConfigFile); } catch {}
      if (!hadDir) { try { rmSync(projectConfigDir, { recursive: true }); } catch {} }
    }
  });
});
