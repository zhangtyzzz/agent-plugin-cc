import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, mkdirSync, rmSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const { OpenCodeAdapter } = await import("../plugins/agent-bridge/dist/adapters/opencode.js");

describe("OpenCodeAdapter model resolution", () => {
  it("uses bridge config model when provided (highest priority)", () => {
    const adapter = new OpenCodeAdapter({ model: "my-provider/my-model" });
    assert.equal(adapter.modelName, "my-provider/my-model");
  });

  it("reads model from project-level opencode.json", () => {
    const workspace = mkdtempSync(join(tmpdir(), "uab-oc-model-"));
    const configFile = join(workspace, "opencode.json");

    try {
      writeFileSync(configFile, JSON.stringify({ model: "custom-provider/custom-model" }));

      const origCwd = process.cwd();
      process.chdir(workspace);
      try {
        const adapter = new OpenCodeAdapter();
        assert.equal(adapter.modelName, "custom-provider/custom-model");
      } finally {
        process.chdir(origCwd);
      }
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  it("reads model from project-level opencode.jsonc (strips comments)", () => {
    const workspace = mkdtempSync(join(tmpdir(), "uab-oc-model-jsonc-"));
    const configFile = join(workspace, "opencode.jsonc");

    try {
      writeFileSync(configFile, `{
  // this is the default model
  "model": "jsonc-provider/jsonc-model"
}`);

      const origCwd = process.cwd();
      process.chdir(workspace);
      try {
        const adapter = new OpenCodeAdapter();
        assert.equal(adapter.modelName, "jsonc-provider/jsonc-model");
      } finally {
        process.chdir(origCwd);
      }
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  it("falls back to model.json recent[0] when no opencode config model", () => {
    const workspace = mkdtempSync(join(tmpdir(), "uab-oc-model-state-"));
    const stateDir = join(workspace, "state", "opencode");
    mkdirSync(stateDir, { recursive: true });

    writeFileSync(join(stateDir, "model.json"), JSON.stringify({
      recent: [
        { providerID: "idleai-router", modelID: "openai/gpt-5.4" },
        { providerID: "anthropic", modelID: "claude-sonnet-4" },
      ],
      favorite: [],
      variant: {},
    }));

    const fakeCwd = mkdtempSync(join(tmpdir(), "uab-oc-empty-cwd-"));
    const origCwd = process.cwd();
    const origXdg = process.env.XDG_STATE_HOME;
    const origXdgConfig = process.env.XDG_CONFIG_HOME;

    try {
      process.chdir(fakeCwd);
      process.env.XDG_STATE_HOME = join(workspace, "state");
      process.env.XDG_CONFIG_HOME = join(workspace, "config-nonexistent");

      const adapter = new OpenCodeAdapter();
      assert.equal(adapter.modelName, "idleai-router/openai/gpt-5.4");
    } finally {
      process.chdir(origCwd);
      if (origXdg === undefined) delete process.env.XDG_STATE_HOME;
      else process.env.XDG_STATE_HOME = origXdg;
      if (origXdgConfig === undefined) delete process.env.XDG_CONFIG_HOME;
      else process.env.XDG_CONFIG_HOME = origXdgConfig;
      rmSync(workspace, { recursive: true, force: true });
      rmSync(fakeCwd, { recursive: true, force: true });
    }
  });

  it("returns undefined when no config or state files exist", () => {
    const workspace = mkdtempSync(join(tmpdir(), "uab-oc-no-model-"));
    const origCwd = process.cwd();
    const origXdg = process.env.XDG_STATE_HOME;
    const origXdgConfig = process.env.XDG_CONFIG_HOME;

    try {
      process.chdir(workspace);
      process.env.XDG_STATE_HOME = join(workspace, "state-nonexistent");
      process.env.XDG_CONFIG_HOME = join(workspace, "config-nonexistent");

      const adapter = new OpenCodeAdapter();
      assert.equal(adapter.modelName, undefined);
    } finally {
      process.chdir(origCwd);
      if (origXdg === undefined) delete process.env.XDG_STATE_HOME;
      else process.env.XDG_STATE_HOME = origXdg;
      if (origXdgConfig === undefined) delete process.env.XDG_CONFIG_HOME;
      else process.env.XDG_CONFIG_HOME = origXdgConfig;
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  it("opencode.json model takes priority over model.json", () => {
    const workspace = mkdtempSync(join(tmpdir(), "uab-oc-priority-"));
    const stateDir = join(workspace, "state", "opencode");
    mkdirSync(stateDir, { recursive: true });

    writeFileSync(join(stateDir, "model.json"), JSON.stringify({
      recent: [{ providerID: "state-provider", modelID: "state-model" }],
    }));

    writeFileSync(join(workspace, "opencode.json"), JSON.stringify({
      model: "config-provider/config-model",
    }));

    const origCwd = process.cwd();
    const origXdg = process.env.XDG_STATE_HOME;
    const origXdgConfig = process.env.XDG_CONFIG_HOME;

    try {
      process.chdir(workspace);
      process.env.XDG_STATE_HOME = join(workspace, "state");
      process.env.XDG_CONFIG_HOME = join(workspace, "config-nonexistent");

      const adapter = new OpenCodeAdapter();
      assert.equal(adapter.modelName, "config-provider/config-model",
        "opencode.json model should take priority over model.json");
    } finally {
      process.chdir(origCwd);
      if (origXdg === undefined) delete process.env.XDG_STATE_HOME;
      else process.env.XDG_STATE_HOME = origXdg;
      if (origXdgConfig === undefined) delete process.env.XDG_CONFIG_HOME;
      else process.env.XDG_CONFIG_HOME = origXdgConfig;
      rmSync(workspace, { recursive: true, force: true });
    }
  });
});
