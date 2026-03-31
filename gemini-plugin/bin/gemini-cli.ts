#!/usr/bin/env node
import { spawn } from "node:child_process";
import path from "node:path";
import { createJob, JobType } from "../core/job";
import { addJob, getJob } from "../core/storage";
import { isDaemonRunning, startDaemonLoop } from "../core/daemon";

function printUsage(): void {
  console.log(`Usage:
  gemini-cli review <input>
  gemini-cli fix <input>
  gemini-cli plan <input>
  gemini-cli status <job_id>
  gemini-cli result <job_id>`);
}

function ensureDaemon(): void {
  if (isDaemonRunning()) return;
  const script = path.resolve(__dirname, "gemini-cli.js");
  const child = spawn(process.execPath, [script, "daemon"], {
    detached: true,
    stdio: "ignore",
  });
  child.unref();
}

function createAndQueue(type: JobType, input: string): void {
  if (!input.trim()) {
    throw new Error("input is required");
  }
  const job = createJob(type, input);
  addJob(job);
  ensureDaemon();
  console.log(job.id);
}

function showStatus(id: string): void {
  const job = getJob(id);
  if (!job) {
    console.error("job not found");
    process.exit(1);
  }
  console.log(job.status);
}

function showResult(id: string): void {
  const job = getJob(id);
  if (!job) {
    console.error("job not found");
    process.exit(1);
  }
  if (job.status === "error") {
    console.error(job.error ?? "unknown error");
    process.exit(1);
  }
  if (job.status !== "done") {
    console.log(`job is ${job.status}`);
    return;
  }
  console.log(job.result ?? "");
}

function main(): void {
  const [, , command, ...args] = process.argv;
  if (!command) {
    printUsage();
    process.exit(1);
  }

  if (command === "daemon") {
    startDaemonLoop();
    return;
  }

  switch (command) {
    case "review":
    case "fix":
    case "plan":
      createAndQueue(command, args.join(" "));
      return;
    case "status":
      showStatus(args[0]);
      return;
    case "result":
      showResult(args[0]);
      return;
    default:
      printUsage();
      process.exit(1);
  }
}

main();
