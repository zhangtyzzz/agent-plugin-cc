import { BaseAdapter, type AdapterConfig, type TaskInput, type TaskOutput, type HealthResult } from "./base.js";

export class QoderAdapter extends BaseAdapter {
  config: AdapterConfig = {
    name: "qoder",
    displayName: "Qoder",
    cliBinary: "qodercli",
    authEnvVar: "QODER_API_KEY",
    capabilities: ["review", "explain", "generate"],
    strengths: ["data-analysis", "sql", "business-logic"],
  };

  private modelLevel?: string;

  constructor(cfg?: any) {
    super();
    if (cfg?.model) this.modelLevel = cfg.model;
  }

  async healthCheck(): Promise<HealthResult> {
    try {
      const version = await this.runCli(this.config.cliBinary, ["-v"], 5000);
      return { ok: true, version: version.trim() };
    } catch {
      return { ok: false, error: "qodercli not installed" };
    }
  }

  async execute(task: TaskInput): Promise<TaskOutput> {
    const start = Date.now();
    const prompt = this.buildReviewPrompt(task) +
      "\n\nIMPORTANT: Only analyze and report findings. Do not modify any files.";

    // qodercli -p "<prompt>" --yolo -f text [--model <level>]
    const args = ["-p", prompt, "--yolo", "-f", "text"];
    if (this.modelLevel) {
      args.push("--model", this.modelLevel);
    }
    const result = await this.runCliWithRetry(this.config.cliBinary, args);

    const model = this.modelLevel || "auto";
    const latencyMs = Date.now() - start;
    this.logCost({ agent: "qoder", task: task.type, latencyMs, model });

    return {
      agent: "qoder",
      model,
      result,
      latencyMs,
    };
  }
}
