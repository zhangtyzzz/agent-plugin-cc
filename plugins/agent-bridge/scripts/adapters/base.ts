import { execSync } from "node:child_process";
import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

export interface AdapterConfig {
  name: string;
  displayName: string;
  cliBinary: string;
  authEnvVar: string;
  capabilities: string[];
  strengths: string[];
  costPer1kTokens?: { input: number; output: number };
}

export interface TaskInput {
  type: "review" | "adversarial-review" | "rescue" | "explain" | "generate" | "free";
  code: string;
  context?: string;
  focus?: string;
  language?: string;
  background?: boolean;
}

export interface TaskOutput {
  agent: string;
  model?: string;
  result: string;
  latencyMs: number;
  costEstimate?: number;
}

export interface HealthResult {
  ok: boolean;
  version?: string;
  error?: string;
}

export abstract class BaseAdapter {
  abstract config: AdapterConfig;
  abstract healthCheck(): Promise<HealthResult>;
  abstract execute(task: TaskInput): Promise<TaskOutput>;

  /** Shell-escape a string for safe inclusion in a shell command */
  private shellEscape(s: string): string {
    return "'" + s.replace(/'/g, "'\\''") + "'";
  }

  /**
   * Run a CLI command synchronously via shell.
   * Using execSync because several CLI tools (notably opencode) hang
   * indefinitely when spawned via Node's async spawn/exec with piped stdio.
   * See: https://github.com/anomalyco/opencode/issues/11891
   */
  protected runCli(binary: string, args: string[], timeoutMs = 300_000): Promise<string> {
    const cmd = [this.shellEscape(binary), ...args.map(a => this.shellEscape(a))].join(" ");
    try {
      const stdout = execSync(cmd, {
        env: { ...process.env },
        timeout: timeoutMs,
        maxBuffer: 50 * 1024 * 1024,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      });
      return Promise.resolve(stdout);
    } catch (err: any) {
      // If process was killed (timeout/signal) but produced stdout, return it
      const stdout = err.stdout?.toString() || "";
      if (stdout.trim() && (err.status === 0 || err.status === null)) {
        return Promise.resolve(stdout);
      }
      const stderr = err.stderr?.toString() || "";
      const code = err.killed ? `timeout(${timeoutMs}ms)` : (err.status ?? err.signal ?? "unknown");
      return Promise.reject(new Error(`${binary} exited with code ${code}: ${stderr}`));
    }
  }

  protected async cliExists(binary: string): Promise<boolean> {
    try {
      await this.runCli("which", [binary], 5000);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Run a CLI command with retry on transient failures.
   * Retries on timeout or non-zero exit up to maxRetries times.
   */
  protected async runCliWithRetry(
    binary: string,
    args: string[],
    timeoutMs = 300_000,
    maxRetries = 1,
  ): Promise<string> {
    let lastError: Error | undefined;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.runCli(binary, args, timeoutMs);
      } catch (err: any) {
        lastError = err;
        if (attempt < maxRetries) {
          const isRetryable =
            err.message?.includes("timeout") ||
            err.message?.includes("SIGTERM") ||
            err.message?.includes("SIGKILL") ||
            err.message?.includes("rate limit") ||
            err.message?.includes("ECONNRESET") ||
            err.message?.includes("ECONNREFUSED") ||
            err.message?.includes("429");
          if (!isRetryable) throw err;
          // brief pause before retry
          await new Promise(r => setTimeout(r, 2000));
        }
      }
    }
    throw lastError;
  }

  /** Log a cost tracking entry to ~/.universal-agent-bridge/cost.log */
  protected logCost(entry: {
    agent: string;
    task: string;
    latencyMs: number;
    costEstimate?: number;
    model?: string;
  }): void {
    try {
      const logDir = join(homedir(), ".universal-agent-bridge");
      mkdirSync(logDir, { recursive: true });
      const logFile = join(logDir, "cost.log");
      const record = {
        timestamp: new Date().toISOString(),
        ...entry,
      };
      appendFileSync(logFile, JSON.stringify(record) + "\n", "utf-8");
    } catch {
      // cost logging is best-effort, don't fail the task
    }
  }

  protected buildReviewPrompt(task: TaskInput): string {
    const focus = task.focus ? `Focus specifically on: ${task.focus}.\n\n` : "";
    const lang = task.language ? `Language: ${task.language}\n` : "";

    let prompt: string;
    switch (task.type) {
      case "review":
        prompt = `${focus}${lang}Review the following code for bugs, edge cases, error handling, and improvements:\n\n${task.code}`;
        break;
      case "adversarial-review":
        prompt = `${focus}${lang}Adversarial code review: actively try to break this code, find security vulnerabilities, race conditions, and edge cases:\n\n${task.code}`;
        break;
      case "rescue":
        prompt = `Investigate and fix this issue:\n\nContext: ${task.context || "See code below"}\n\n${task.code}`;
        break;
      case "explain":
        prompt = `${lang}Explain what this code does, step by step. Include the overall architecture, key decisions, and any potential issues:\n\n${task.code}`;
        break;
      case "generate":
        prompt = `${lang}${task.context || task.code}`;
        break;
      default:
        prompt = task.code;
        break;
    }

    // Read-only tasks get an explicit instruction not to modify files
    const readOnlyTypes = ["review", "adversarial-review", "explain"];
    if (readOnlyTypes.includes(task.type)) {
      prompt += "\n\nIMPORTANT: Only analyze and report findings. Do not modify any files.";
    }

    return prompt;
  }
}
