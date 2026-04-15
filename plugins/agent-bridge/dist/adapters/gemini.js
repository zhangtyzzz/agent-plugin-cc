import { BaseAdapter } from "./base.js";
export class GeminiAdapter extends BaseAdapter {
    config = {
        name: "gemini",
        displayName: "Gemini CLI",
        cliBinary: "gemini",
        authEnvVar: "GOOGLE_API_KEY",
        capabilities: ["review", "explain", "generate"],
        strengths: ["search-grounding", "free-tier", "fast", "google-cloud"],
        costPer1kTokens: { input: 0, output: 0 },
    };
    async healthCheck() {
        try {
            const exists = await this.cliExists(this.config.cliBinary);
            if (!exists) {
                return { ok: false, error: "gemini CLI not installed" };
            }
            return { ok: true, version: "latest" };
        }
        catch {
            return { ok: false, error: "gemini CLI not available" };
        }
    }
    async execute(task) {
        const start = Date.now();
        const prompt = this.buildReviewPrompt(task);
        const result = await this.runCliWithRetry(this.config.cliBinary, ["-p", prompt]);
        const latencyMs = Date.now() - start;
        this.logCost({ agent: "gemini", task: task.type, latencyMs, model: "gemini-2.5-pro" });
        return {
            agent: "gemini",
            model: "gemini-2.5-pro",
            result,
            latencyMs,
        };
    }
}
