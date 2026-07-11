export type TrialReminderJobResult = {
  scanned: number;
  sent7Day: number;
  sent1Day: number;
  skipped: number;
};

export type TrialReminderJobRun = {
  finishedAt: string;
  ok: boolean;
  result?: TrialReminderJobResult;
  errorMessage?: string;
};

let lastTrialReminderRun: TrialReminderJobRun | null = null;
let lastSuccessfulTrialReminderRun: TrialReminderJobRun | null = null;
let lastFailedTrialReminderRun: TrialReminderJobRun | null = null;

export function recordTrialReminderJobRun(
  input: { ok: true; result: TrialReminderJobResult } | { ok: false; errorMessage: string },
  now = new Date(),
): void {
  const run: TrialReminderJobRun = {
    finishedAt: now.toISOString(),
    ok: input.ok,
    result: input.ok ? input.result : undefined,
    errorMessage: input.ok ? undefined : input.errorMessage,
  };
  lastTrialReminderRun = run;
  if (input.ok) {
    lastSuccessfulTrialReminderRun = run;
  } else {
    lastFailedTrialReminderRun = run;
  }
}

export function getLastTrialReminderJobRun(): TrialReminderJobRun | null {
  return lastTrialReminderRun;
}

export function getLastSuccessfulTrialReminderJobRun(): TrialReminderJobRun | null {
  return lastSuccessfulTrialReminderRun;
}

export function getLastFailedTrialReminderJobRun(): TrialReminderJobRun | null {
  return lastFailedTrialReminderRun;
}

/** True when a job ran within the last 48 hours (external cron appears active). */
export function isSchedulerRecentlyActive(now = new Date()): boolean {
  if (!lastTrialReminderRun) return false;
  const finishedAt = new Date(lastTrialReminderRun.finishedAt).getTime();
  return now.getTime() - finishedAt <= 48 * 60 * 60 * 1000;
}

export function estimateNextTrialReminderRun(now = new Date()): string | null {
  if (!lastSuccessfulTrialReminderRun) return null;
  const last = new Date(lastSuccessfulTrialReminderRun.finishedAt);
  const next = new Date(last);
  next.setDate(next.getDate() + 1);
  if (next.getTime() <= now.getTime()) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(last.getHours(), last.getMinutes(), 0, 0);
    return tomorrow.toISOString();
  }
  return next.toISOString();
}

export function resetTrialReminderJobRunForTests(): void {
  lastTrialReminderRun = null;
  lastSuccessfulTrialReminderRun = null;
  lastFailedTrialReminderRun = null;
}
