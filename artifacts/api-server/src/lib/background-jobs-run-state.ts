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

export function recordTrialReminderJobRun(
  input: { ok: true; result: TrialReminderJobResult } | { ok: false; errorMessage: string },
  now = new Date(),
): void {
  lastTrialReminderRun = {
    finishedAt: now.toISOString(),
    ok: input.ok,
    result: input.ok ? input.result : undefined,
    errorMessage: input.ok ? undefined : input.errorMessage,
  };
}

export function getLastTrialReminderJobRun(): TrialReminderJobRun | null {
  return lastTrialReminderRun;
}

export function resetTrialReminderJobRunForTests(): void {
  lastTrialReminderRun = null;
}
