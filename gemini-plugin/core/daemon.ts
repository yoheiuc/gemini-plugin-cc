import fs from "node:fs";
import { pidPath } from "./storage";
import { InMemoryQueue } from "./queue";
import { Worker } from "./worker";

export function isDaemonRunning(): boolean {
  const p = pidPath();
  if (!fs.existsSync(p)) return false;
  const pid = Number(fs.readFileSync(p, "utf-8").trim());
  if (!Number.isFinite(pid)) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function writePid(): void {
  fs.mkdirSync(require("node:path").dirname(pidPath()), { recursive: true });
  fs.writeFileSync(pidPath(), String(process.pid), "utf-8");
}

export function startDaemonLoop(): void {
  writePid();
  const queue = new InMemoryQueue();
  const worker = new Worker(queue);

  setInterval(() => {
    worker.poll();
    void worker.tick();
  }, 1000);
}
