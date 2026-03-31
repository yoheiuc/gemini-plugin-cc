import { InMemoryQueue } from "./queue";
import { Job } from "./job";
import { runGeminiJob } from "./runner";
import { listJobs, updateJob } from "./storage";

export class Worker {
  private busy = false;
  private readonly queuedIds = new Set<string>();

  constructor(private readonly queue: InMemoryQueue) {}

  poll(): void {
    const pending = listJobs().filter((j) => j.status === "queued");
    pending.forEach((job) => {
      if (!this.queuedIds.has(job.id) && !this.queue.has(job.id)) {
        this.queue.enqueue(job);
        this.queuedIds.add(job.id);
      }
    });
  }

  async tick(): Promise<void> {
    if (this.busy) return;
    const job = this.queue.dequeue();
    if (!job) return;

    this.busy = true;
    try {
      await this.handleJob(job);
    } finally {
      this.queuedIds.delete(job.id);
      this.busy = false;
    }
  }

  private async handleJob(job: Job): Promise<void> {
    const attempts = (job.attempts ?? 0) + 1;
    updateJob(job.id, { status: "running", attempts, error: undefined });

    try {
      const result = await runGeminiJob(job.type, job.input, 60000);
      updateJob(job.id, { status: "done", result, error: undefined });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (attempts <= 1) {
        updateJob(job.id, { status: "queued", attempts, error: message });
        const refreshed = listJobs().find((j) => j.id === job.id);
        if (refreshed) {
          this.queue.enqueue(refreshed);
          this.queuedIds.add(job.id);
        }
        return;
      }
      updateJob(job.id, { status: "error", error: message, attempts });
    }
  }
}
