export const REPORT_FAB_DISMISSED_KEY = "townhub.reportFab.dismissed";
export const REPORT_FAB_VISIBILITY_EVENT = "townhub:report-fab-visibility";

export function isReportFabDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(REPORT_FAB_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function setReportFabDismissed(dismissed: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (dismissed) {
      window.localStorage.setItem(REPORT_FAB_DISMISSED_KEY, "1");
    } else {
      window.localStorage.removeItem(REPORT_FAB_DISMISSED_KEY);
    }
  } catch {
    // Private mode / blocked storage — still notify listeners for this session.
  }
  window.dispatchEvent(new Event(REPORT_FAB_VISIBILITY_EVENT));
}
