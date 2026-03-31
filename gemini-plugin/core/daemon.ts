import fs from "node:fs";
import { heartbeatPath, pidPath } from "./storage";
import { InMemoryQueue } from "./queue";
import { Worker } from "./worker";

const HEARTBEAT_STALE_MS = 15000;

function readPid(): number | undefined {
  const p = pidPath();
  if (!fs.existsSync(p)) return undefined;
  const pid = Number(fs.readFileSync(p, "utf-8").trim());
  if (!Number.isFinite(pid)) return undefined;
  return pid;
}

function isHeartbeatStale(now: number): boolean {
  const p = heartbeatPath();
  if (!fs.existsSync(p)) return true;
  const raw = fs.readFileSync(p, "utf-8").trim();
  const ts = Number(raw);
  if (!Number.isFinite(ts)) return true;
  return now - ts > HEARTBEAT_STALE_MS;
}

function clearDaemonState(): void {
  [pidPath(), heartbeatPath()].forEach((p) => {
    if (fs.existsSync(p)) {
      fs.unlinkSync(p);
    }
  });
}

export function isDaemonRunning(): boolean {
  const pid = readPid();
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    if (isHeartbeatStale(Date.now())) {
      clearDaemonState();
      return false;
    }
    return true;
  } catch {
    clearDaemonState();
    return false;
  }
}

export function writePid(): void {
  fs.mkdirSync(require("node:path").dirname(pidPath()), { recursive: true });
  fs.writeFileSync(pidPath(), String(process.pid), "utf-8");
}

function writeHeartbeat(ts = Date.now()): void {
  fs.mkdirSync(require("node:path").dirname(heartbeatPath()), { recursive: true });
  fs.writeFileSync(heartbeatPath(), String(ts), "utf-8");
}

export function startDaemonLoop(): void {
  writePid();
  writeHeartbeat();
  const queue = new InMemoryQueue();
  const worker = new Worker(queue);

  setInterval(() => {
    writeHeartbeat();
    worker.poll();
    void worker.tick();
  }, 1000);
}
