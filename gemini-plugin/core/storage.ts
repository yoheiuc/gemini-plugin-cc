import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { Job } from "./job";

type Db = { jobs: Job[] };

function baseDir(): string {
  return path.join(os.homedir(), ".gemini-plugin");
}

export function dbPath(): string {
  return path.join(baseDir(), "jobs.json");
}

export function pidPath(): string {
  return path.join(baseDir(), "daemon.pid");
}

export function heartbeatPath(): string {
  return path.join(baseDir(), "daemon.heartbeat");
}

function ensureDir(): void {
  fs.mkdirSync(baseDir(), { recursive: true });
}

function readDb(): Db {
  ensureDir();
  const p = dbPath();
  if (!fs.existsSync(p)) {
    return { jobs: [] };
  }
  const raw = fs.readFileSync(p, "utf-8");
  if (!raw.trim()) {
    return { jobs: [] };
  }
  return JSON.parse(raw) as Db;
}

function writeDb(db: Db): void {
  ensureDir();
  fs.writeFileSync(dbPath(), JSON.stringify(db, null, 2), "utf-8");
}

export function addJob(job: Job): void {
  const db = readDb();
  db.jobs.push(job);
  writeDb(db);
}

export function listJobs(): Job[] {
  return readDb().jobs;
}

export function getJob(id: string): Job | undefined {
  return listJobs().find((j) => j.id === id);
}

export function updateJob(id: string, patch: Partial<Job>): Job | undefined {
  const db = readDb();
  const idx = db.jobs.findIndex((j) => j.id === id);
  if (idx === -1) return undefined;
  db.jobs[idx] = { ...db.jobs[idx], ...patch };
  writeDb(db);
  return db.jobs[idx];
}
