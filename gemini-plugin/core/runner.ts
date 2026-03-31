import { spawn } from "node:child_process";
import { JobType } from "./job";

const TEMPLATE = `You are Gemini acting as a coding sub-agent.

Task:
{{TASK}}

Constraints:
- Only use given context
- Prefer minimal changes
- Be explicit about uncertainty

Context:
{{CONTEXT}}`;

function normalizeOutput(output: string): string {
  const trimmed = output.trim();
  return `## Summary\n${trimmed || "(no summary)"}\n\n## Findings\n- (not provided)\n\n## Suggested Fix\n- (not provided)\n\n## Risks\n- (not provided)`;
}

function buildTask(type: JobType, input: string): string {
  return `[${type.toUpperCase()}] ${input}`;
}

export async function runGeminiJob(type: JobType, input: string, timeoutMs = 60000): Promise<string> {
  const prompt = TEMPLATE.replace("{{TASK}}", buildTask(type, input)).replace("{{CONTEXT}}", input);

  return new Promise((resolve, reject) => {
    const child = spawn("gemini", ["-p", prompt], { stdio: ["ignore", "pipe", "pipe"] });

    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`gemini command timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    child.on("close", (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve(normalizeOutput(stdout));
        return;
      }
      reject(new Error(stderr.trim() || `gemini exited with code ${code}`));
    });
  });
}
