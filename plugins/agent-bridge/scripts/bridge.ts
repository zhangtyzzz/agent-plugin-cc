// plugins/agent-bridge/scripts/bridge.ts
//
// Usage (from command markdown):
//   !npx tsx <path>/bridge.ts --task review --agent codex --code-file /tmp/uab-input.txt
//   !npx tsx <path>/bridge.ts --task health
//   !npx tsx <path>/bridge.ts --task list
//   !npx tsx <path>/bridge.ts --task compare --agents codex,gemini --code-file /tmp/code.txt

import { parseArgs } from "node:util";
import { readFileSync, existsSync } from "node:fs";

// -- Import modules --
import { loadConfig, type BridgeConfig } from "./config.js";
import { Router } from "./router.js";
import { CodexAdapter } from "./adapters/codex.js";
import { GeminiAdapter } from "./adapters/gemini.js";
import { OpenCodeAdapter } from "./adapters/opencode.js";
import { QoderAdapter } from "./adapters/qoder.js";
import type { BaseAdapter, TaskInput, TaskOutput } from "./adapters/base.js";

// -- Parse command line args --
const { values: args } = parseArgs({
  options: {
    task:        { type: "string", short: "t" },  // review|adversarial-review|rescue|explain|generate|health|list|compare
    agent:       { type: "string", short: "a" },  // specify agent name (optional)
    agents:      { type: "string" },               // compare mode: comma-separated
    "code-file": { type: "string", short: "f" },  // code file path
    focus:       { type: "string" },               // review focus
    language:    { type: "string", short: "l" },  // programming language
    context:     { type: "string", short: "c" },  // extra context
    background:  { type: "boolean", short: "b", default: false },
    base:        { type: "string" },               // diff base branch
  },
  strict: false,
  allowPositionals: true,
});

// -- Initialize Adapter Registry --
function createAdapterRegistry(config: BridgeConfig): Map<string, BaseAdapter> {
  const registry = new Map<string, BaseAdapter>();
  const agentConfigs = config.agents;

  const adapterClasses: Record<string, new (cfg: any) => BaseAdapter> = {
    codex: CodexAdapter,
    opencode: OpenCodeAdapter,
    gemini: GeminiAdapter,
    qoder: QoderAdapter,
  };

  for (const [name, agentCfg] of Object.entries(agentConfigs)) {
    if (!agentCfg.enabled) continue;
    const AdapterClass = adapterClasses[name];
    if (AdapterClass) {
      registry.set(name, new AdapterClass(agentCfg));
    }
  }

  return registry;
}

// -- Main flow --
async function main() {
  const config = loadConfig();
  const registry = createAdapterRegistry(config);

  // Convert routing_rules from config format to Router format
  const routingRules = (config.routing_rules || []).map((r) => ({
    match: {
      taskType: r.match.task_type,
      language: r.match.language,
      focus: r.match.focus,
      keyword: r.match.keyword,
    },
    routeTo: r.route_to,
    reason: r.reason,
  }));

  const router = new Router(registry, routingRules, config.fallback_chain || []);

  const task = args.task;
  if (!task) {
    console.error("Error: --task is required");
    process.exit(1);
  }

  // ---- health command ----
  if (task === "health") {
    console.log("## Agent Health Check\n");
    console.log("| Agent | Status | Version | Auth |");
    console.log("|-------|--------|---------|------|");
    for (const [name, adapter] of registry) {
      const health = await adapter.healthCheck();
      const status = health.ok ? "✅ OK" : "❌ Fail";
      const version = health.version || "-";
      const error = health.error || "OK";
      console.log(`| ${name} | ${status} | ${version} | ${error} |`);
    }
    return;
  }

  // ---- list command ----
  if (task === "list") {
    console.log("## Available Agents\n");
    for (const [name, adapter] of registry) {
      const cfg = adapter.config;
      console.log(`### ${cfg.displayName} (\`${name}\`)`);
      console.log(`- CLI: \`${cfg.cliBinary}\``);
      console.log(`- Capabilities: ${cfg.capabilities.join(", ")}`);
      console.log(`- Strengths: ${cfg.strengths.join(", ")}`);
      if (cfg.costPer1kTokens) {
        console.log(`- Cost: $${cfg.costPer1kTokens.input}/$${cfg.costPer1kTokens.output} per 1k tokens`);
      } else {
        console.log(`- Cost: Free`);
      }
      console.log("");
    }
    return;
  }

  // ---- Commands that need code ----
  const validTasks = ["review", "adversarial-review", "rescue", "explain", "generate", "free", "compare"];
  if (!validTasks.includes(task)) {
    console.error(`Error: unknown task "${task}". Valid tasks: ${validTasks.join(", ")}`);
    process.exit(1);
  }

  let code = "";
  const codeFile = args["code-file"];
  if (codeFile && existsSync(codeFile)) {
    code = readFileSync(codeFile, "utf-8");
  }

  // Require code for tasks that need it (unless generate with context)
  const needsCode = ["review", "adversarial-review", "rescue", "explain", "compare"];
  if (needsCode.includes(task) && !code.trim()) {
    console.error(`Error: --code-file is required for task "${task}" and must not be empty`);
    process.exit(1);
  }

  const taskInput: TaskInput = {
    type: task as TaskInput["type"],
    code,
    context: args.context || "",
    focus: args.focus || "",
    language: args.language || "",
    background: args.background || false,
  };

  // ---- compare command ----
  if (task === "compare") {
    const agentNames = (args.agents || "").split(",").map(s => s.trim()).filter(Boolean);
    if (agentNames.length < 2) {
      console.error("Error: --agents requires at least 2 comma-separated agent names");
      process.exit(1);
    }

    console.log(`## Comparison: ${agentNames.join(" vs ")}\n`);

    const results: TaskOutput[] = [];
    // Execute in parallel
    const promises = agentNames.map(async (name) => {
      const adapter = registry.get(name);
      if (!adapter) {
        return { agent: name, result: `Error: agent "${name}" not found or not enabled`, latencyMs: 0 };
      }
      try {
        return await adapter.execute({ ...taskInput, type: "review" });
      } catch (e: any) {
        return { agent: name, result: `Error: ${e.message}`, latencyMs: 0 };
      }
    });

    const outputs = await Promise.all(promises);

    for (const output of outputs) {
      console.log(`### Review by ${output.agent}${output.model ? ` (${output.model})` : ""}`);
      console.log(`*Latency: ${output.latencyMs}ms${output.costEstimate ? ` | Est. cost: $${output.costEstimate}` : ""}*`);
      console.log(output.result);
      console.log("\n---\n");
    }
    return;
  }

  // ---- Single agent execution (review, adversarial-review, rescue, explain, generate) ----
  let agentName: string;

  if (args.agent) {
    // User specified an agent
    agentName = args.agent;
  } else {
    // Auto-route
    const routeResult = await router.select(taskInput);
    agentName = routeResult.agent;
    console.log(`*Auto-routed to **${agentName}**: ${routeResult.reason}*\n`);
  }

  const adapter = registry.get(agentName);
  if (!adapter) {
    console.error(`Error: agent "${agentName}" not found or not enabled.`);
    console.error(`Available agents: ${[...registry.keys()].join(", ")}`);
    process.exit(1);
  }

  try {
    const output = await adapter.execute(taskInput);
    console.log(`## ${task.replace("-", " ").replace(/\b\w/g, c => c.toUpperCase())}`);
    console.log(`*Latency: ${output.latencyMs}ms${output.costEstimate ? ` | Est. cost: $${output.costEstimate}` : ""}*`);
    console.log(output.result);
  } catch (e: any) {
    console.error(`Error executing ${agentName}: ${e.message}`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
