import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
function deepMerge(target, source) {
    const result = { ...target };
    for (const key of Object.keys(source)) {
        if (source[key] &&
            typeof source[key] === "object" &&
            !Array.isArray(source[key]) &&
            target[key] &&
            typeof target[key] === "object" &&
            !Array.isArray(target[key])) {
            result[key] = deepMerge(target[key], source[key]);
        }
        else {
            result[key] = source[key];
        }
    }
    return result;
}
function loadJsonFile(path) {
    if (!existsSync(path))
        return null;
    const content = readFileSync(path, "utf-8");
    return JSON.parse(content);
}
export function loadConfig() {
    // Plugin default config — __dirname is plugins/agent-bridge/scripts/ (or dist/)
    // Project root is 3 levels up: scripts -> agent-bridge -> plugins -> root
    const projectRoot = resolve(__dirname, "..", "..", "..");
    const defaultConfigPath = resolve(projectRoot, "config", "default-config.json");
    // User-level config
    const homeDir = process.env.HOME || process.env.USERPROFILE || "";
    const userConfigPath = resolve(homeDir, ".universal-agent-bridge", "config.json");
    // Project-level config
    const cwd = process.cwd();
    const projectConfigPath = resolve(cwd, ".universal-agent-bridge", "config.json");
    // Load and merge: default < user < project
    let config = loadJsonFile(defaultConfigPath) || {};
    const userConfig = loadJsonFile(userConfigPath);
    if (userConfig)
        config = deepMerge(config, userConfig);
    const projectConfig = loadJsonFile(projectConfigPath);
    if (projectConfig)
        config = deepMerge(config, projectConfig);
    // Ensure required fields exist
    if (!config.bridge) {
        config.bridge = {
            default_strategy: "best_fit",
            cost_limit_usd_per_day: 5.0,
            log_level: "info",
        };
    }
    if (!config.agents)
        config.agents = {};
    if (!config.routing_rules)
        config.routing_rules = [];
    if (!config.fallback_chain)
        config.fallback_chain = ["codex", "gemini", "qoder"];
    return config;
}
