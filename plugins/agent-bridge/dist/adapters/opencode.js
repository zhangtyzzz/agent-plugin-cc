import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, unlinkSync, existsSync, mkdtempSync, rmdirSync } from "node:fs";
import { tmpdir, homedir } from "node:os";
import { join } from "node:path";
import { BaseAdapter } from "./base.js";
export class OpenCodeAdapter extends BaseAdapter {
    config = {
        name: "opencode",
        displayName: "OpenCode",
        cliBinary: "opencode",
        authEnvVar: "OPENROUTER_API_KEY",
        capabilities: ["review", "adversarial-review", "rescue", "generate", "explain"],
        strengths: ["multi-model", "python", "cost-efficient", "local-models"],
    };
    modelName;
    constructor(cfg) {
        super();
        if (cfg?.model) {
            this.modelName = cfg.model;
        }
        else {
            this.modelName = this.resolveOpenCodeModel();
        }
    }
    /**
     * Auto-detect the user's preferred opencode model from opencode's own config chain.
     *
     * Priority (matches opencode's documented loading order):
     *   1. Project opencode.json / opencode.jsonc  →  "model" field
     *   2. Global  ~/.config/opencode/opencode.json(c) →  "model" field
     *   3. State   ~/.local/state/opencode/model.json →  recent[0]  (TUI selection)
     *
     * Returns undefined when nothing is found — opencode will pick its own default.
     */
    resolveOpenCodeModel() {
        // 1. Project-level opencode config
        const cwd = process.cwd();
        for (const name of ["opencode.json", "opencode.jsonc"]) {
            const m = this.readModelFromConfig(join(cwd, name));
            if (m)
                return m;
        }
        // 2. Global opencode config
        const globalDir = process.env.XDG_CONFIG_HOME
            ? join(process.env.XDG_CONFIG_HOME, "opencode")
            : join(homedir(), ".config", "opencode");
        for (const name of ["opencode.json", "opencode.jsonc"]) {
            const m = this.readModelFromConfig(join(globalDir, name));
            if (m)
                return m;
        }
        // 3. TUI state — recent model selection
        const stateDir = process.env.XDG_STATE_HOME
            ? join(process.env.XDG_STATE_HOME, "opencode")
            : join(homedir(), ".local", "state", "opencode");
        const modelJsonPath = join(stateDir, "model.json");
        try {
            const data = JSON.parse(readFileSync(modelJsonPath, "utf-8"));
            if (Array.isArray(data.recent) && data.recent.length > 0) {
                const { providerID, modelID } = data.recent[0];
                if (typeof providerID === "string" && typeof modelID === "string") {
                    return `${providerID}/${modelID}`;
                }
            }
        }
        catch {
            // model.json missing or unreadable — no problem
        }
        return undefined;
    }
    /** Read the top-level "model" field from an opencode config file. */
    readModelFromConfig(filePath) {
        try {
            if (!existsSync(filePath))
                return undefined;
            let text = readFileSync(filePath, "utf-8");
            // Strip JSONC single-line comments (but not // inside strings)
            if (filePath.endsWith(".jsonc")) {
                text = text.replace(/"(?:[^"\\]|\\.)*"|\/\/.*$/gm, (m) => m.startsWith('"') ? m : "");
            }
            const data = JSON.parse(text);
            if (typeof data.model === "string" && data.model)
                return data.model;
        }
        catch {
            // parse error or IO error — skip
        }
        return undefined;
    }
    async healthCheck() {
        try {
            const version = await this.runCli(this.config.cliBinary, ["--version"], 5000);
            return { ok: true, version: version.trim() };
        }
        catch {
            return { ok: false, error: "opencode CLI not installed" };
        }
    }
    async execute(task) {
        const start = Date.now();
        const prompt = this.buildReviewPrompt(task);
        const raw = await this.runOpenCode(prompt);
        const result = this.parseJsonOutput(raw);
        const latencyMs = Date.now() - start;
        this.logCost({ agent: "opencode", task: task.type, latencyMs, model: this.modelName || "default" });
        return {
            agent: "opencode",
            model: this.modelName || "default",
            result,
            latencyMs,
        };
    }
    /**
     * opencode run hangs when spawned as a subprocess via Node.js spawn/exec
     * because it does not write to stdout in non-TTY mode and internal servers
     * (SSE, LSP, file watcher) keep the event loop alive indefinitely.
     * See: https://github.com/anomalyco/opencode/issues/11891
     *
     * Workaround: write prompt to temp file, run via shell with output
     * redirected to a temp file, then read the result.
     */
    async runOpenCode(prompt, timeoutMs = 120_000) {
        const tmpDir = mkdtempSync(join(tmpdir(), "uab-oc-"));
        const promptFile = join(tmpDir, "prompt.txt");
        const outFile = join(tmpDir, "out.json");
        writeFileSync(promptFile, prompt, { encoding: "utf-8", mode: 0o600 });
        try {
            const shellEscape = (s) => "'" + s.replace(/'/g, "'\\''") + "'";
            const parts = [
                shellEscape(this.config.cliBinary),
                "run", "--format", "json",
            ];
            // Only specify model if explicitly configured; otherwise let opencode use its default
            if (this.modelName) {
                parts.push("--model", shellEscape(this.modelName));
            }
            parts.push(`"$(cat ${shellEscape(promptFile)})"`, ">", shellEscape(outFile), "2>&1");
            const cmd = parts.join(" ");
            execSync(cmd, {
                timeout: timeoutMs,
                shell: "/bin/bash",
                stdio: "ignore",
                killSignal: "SIGKILL",
            });
        }
        catch (e) {
            // execSync throws on timeout or non-zero exit
            // But the output file may still have valid content
            if (!existsSync(outFile)) {
                throw new Error(`opencode failed: ${e.message}`);
            }
        }
        finally {
            try {
                unlinkSync(promptFile);
            }
            catch { }
        }
        // Read output
        try {
            const content = readFileSync(outFile, "utf-8");
            this.cleanupDir(tmpDir);
            if (!content.trim()) {
                throw new Error("opencode produced no output");
            }
            return content;
        }
        catch (e) {
            this.cleanupDir(tmpDir);
            throw new Error(`opencode output read failed: ${e.message}`);
        }
    }
    cleanupDir(dir) {
        try {
            // Remove files inside, then dir
            for (const f of ["prompt.txt", "out.json"]) {
                try {
                    unlinkSync(join(dir, f));
                }
                catch { }
            }
            rmdirSync(dir);
        }
        catch { }
    }
    /** Parse opencode JSON stream output — extract text parts */
    parseJsonOutput(raw) {
        const texts = [];
        for (const line of raw.split("\n")) {
            if (!line.trim())
                continue;
            try {
                const event = JSON.parse(line);
                if (event.type === "text" && event.part?.text) {
                    texts.push(event.part.text);
                }
            }
            catch {
                // Not JSON, include as-is
                if (line.trim())
                    texts.push(line);
            }
        }
        return texts.join("\n") || raw;
    }
}
