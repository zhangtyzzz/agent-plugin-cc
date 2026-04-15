import { BaseAdapter } from "./base.js";
export class CodexAdapter extends BaseAdapter {
    config = {
        name: "codex",
        displayName: "OpenAI Codex",
        cliBinary: "codex",
        authEnvVar: "OPENAI_API_KEY",
        capabilities: ["review", "adversarial-review", "rescue", "generate", "explain"],
        strengths: ["security", "edge-cases", "deep-reasoning", "typescript"],
        costPer1kTokens: { input: 0.003, output: 0.012 },
    };
    model;
    constructor(cfg) {
        super();
        if (cfg?.model)
            this.model = cfg.model;
    }
    async healthCheck() {
        try {
            const version = await this.runCli(this.config.cliBinary, ["--version"], 5000);
            return { ok: true, version: version.trim() };
        }
        catch {
            return { ok: false, error: "codex CLI not installed" };
        }
    }
    async execute(task) {
        const start = Date.now();
        const prompt = this.buildReviewPrompt(task) +
            (task.type !== "rescue" && task.type !== "generate"
                ? "\n\nIMPORTANT: Only analyze and report findings. Do not modify any files."
                : "");
        // codex exec --full-auto [--model <m>] <prompt>
        const args = ["exec", "--full-auto"];
        if (this.model)
            args.push("--model", this.model);
        args.push(prompt);
        const result = await this.runCliWithRetry(this.config.cliBinary, args);
        const latencyMs = Date.now() - start;
        const modelName = this.model || "codex-1";
        this.logCost({ agent: "codex", task: task.type, latencyMs, model: modelName });
        return {
            agent: "codex",
            model: modelName,
            result,
            latencyMs,
        };
    }
}
