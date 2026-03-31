export type JobType = "review" | "fix" | "plan";
export type JobStatus = "queued" | "running" | "done" | "error";

export type Job = {
  id: string;
  type: JobType;
  status: JobStatus;
  input: string;
  result?: string;
  error?: string;
  createdAt: number;
  attempts?: number;
};

export function createJob(type: JobType, input: string): Job {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    type,
    status: "queued",
    input,
    createdAt: Date.now(),
    attempts: 0,
  };
}
