import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { parse as parseYaml } from "yaml";
import { fileURLToPath } from "node:url";

export interface AgentConfig {
  enabled: boolean;
  auth_env?: string;
  cli_binary?: string;
  cli_args?: string[];
  model?: string;
  strengths?: string[];
  cost_per_1k?: { input: number; output: number };
}

export interface BridgeConfig {
  bridge: {
    default_strategy: string;
    cost_limit_usd_per_day: number;
    log_level: string;
  };
  agents: Record<string, AgentConfig>;
  routing_rules: RoutingRuleConfig[];
  fallback_chain: string[];
}

export interface RoutingRuleConfig {
  match: {
    task_type?: string;
    language?: string;
    focus?: string;
    keyword?: string;
  };
  route_to: string;
  reason: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function deepMerge(target: any, source: any): any {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === "object" &&
      !Array.isArray(source[key]) &&
      target[key] &&
      typeof target[key] === "object" &&
      !Array.isArray(target[key])
    ) {
      result[key] = deepMerge(target[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

function loadYamlFile(path: string): any {
  if (!existsSync(path)) return null;
  const content = readFileSync(path, "utf-8");
  return parseYaml(content);
}

export function loadConfig(): BridgeConfig {
  // Plugin default config — __dirname is plugins/agent-bridge/scripts/
  // Project root is 3 levels up: scripts -> agent-bridge -> plugins -> root
  const projectRoot = resolve(__dirname, "..", "..", "..");
  const defaultConfigPath = resolve(projectRoot, "config", "default-config.yaml");

  // User-level config
  const homeDir = process.env.HOME || process.env.USERPROFILE || "";
  const userConfigPath = resolve(homeDir, ".universal-agent-bridge", "config.yaml");

  // Project-level config
  const cwd = process.cwd();
  const projectConfigPath = resolve(cwd, ".universal-agent-bridge", "config.yaml");

  // Load and merge: default < user < project
  let config = loadYamlFile(defaultConfigPath) || {};
  const userConfig = loadYamlFile(userConfigPath);
  if (userConfig) config = deepMerge(config, userConfig);
  const projectConfig = loadYamlFile(projectConfigPath);
  if (projectConfig) config = deepMerge(config, projectConfig);

  // Ensure required fields exist
  if (!config.bridge) {
    config.bridge = {
      default_strategy: "best_fit",
      cost_limit_usd_per_day: 5.0,
      log_level: "info",
    };
  }
  if (!config.agents) config.agents = {};
  if (!config.routing_rules) config.routing_rules = [];
  if (!config.fallback_chain) config.fallback_chain = ["codex", "gemini", "qoder"];

  return config as BridgeConfig;
}
