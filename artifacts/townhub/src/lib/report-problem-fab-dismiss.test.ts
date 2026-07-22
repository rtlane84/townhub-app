import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  isReportFabDismissed,
  REPORT_FAB_DISMISSED_KEY,
  setReportFabDismissed,
} from "./report-problem-fab-dismiss.ts";

const memory = new Map<string, string>();

const localStorageStub = {
  getItem(key: string) {
    return memory.has(key) ? memory.get(key)! : null;
  },
  setItem(key: string, value: string) {
    memory.set(key, String(value));
  },
  removeItem(key: string) {
    memory.delete(key);
  },
};

afterEach(() => {
  memory.clear();
});

describe("report FAB dismiss storage", () => {
  it("defaults to not dismissed", () => {
    (globalThis as { window?: unknown }).window = {
      localStorage: localStorageStub,
      dispatchEvent: () => true,
    };
    assert.equal(isReportFabDismissed(), false);
  });

  it("persists dismiss and clear", () => {
    let events = 0;
    (globalThis as { window?: unknown }).window = {
      localStorage: localStorageStub,
      dispatchEvent: () => {
        events += 1;
        return true;
      },
    };

    setReportFabDismissed(true);
    assert.equal(memory.get(REPORT_FAB_DISMISSED_KEY), "1");
    assert.equal(isReportFabDismissed(), true);
    assert.equal(events, 1);

    setReportFabDismissed(false);
    assert.equal(memory.has(REPORT_FAB_DISMISSED_KEY), false);
    assert.equal(isReportFabDismissed(), false);
    assert.equal(events, 2);
  });
});
