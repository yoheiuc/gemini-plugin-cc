import { Job } from "./job";

export class InMemoryQueue {
  private readonly items: Job[] = [];

  enqueue(job: Job): void {
    if (this.items.some((j) => j.id === job.id)) {
      return;
    }
    this.items.push(job);
  }

  dequeue(): Job | undefined {
    return this.items.shift();
  }

  has(id: string): boolean {
    return this.items.some((j) => j.id === id);
  }
}
