import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";
import { clearUsZipLookupCache, lookupUsZip } from "./zip-lookup";

afterEach(() => {
  clearUsZipLookupCache();
  mock.restoreAll();
});

describe("lookupUsZip", () => {
  it("returns city and state for a successful Zippopotam response", async () => {
    mock.method(globalThis, "fetch", async () =>
      new Response(
        JSON.stringify({
          "post code": "25043",
          places: [
            {
              "place name": "Clay",
              "state abbreviation": "WV",
              state: "West Virginia",
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const result = await lookupUsZip("25043");
    assert.deepEqual(result, { zip: "25043", city: "Clay", state: "WV" });
  });

  it("returns null for invalid ZIP format without calling the network", async () => {
    let called = false;
    mock.method(globalThis, "fetch", async () => {
      called = true;
      return new Response("", { status: 500 });
    });

    assert.equal(await lookupUsZip("12"), null);
    assert.equal(called, false);
  });

  it("returns null and caches 404 responses", async () => {
    let calls = 0;
    mock.method(globalThis, "fetch", async () => {
      calls += 1;
      return new Response("", { status: 404 });
    });

    assert.equal(await lookupUsZip("00000"), null);
    assert.equal(await lookupUsZip("00000"), null);
    assert.equal(calls, 1);
  });

  it("reuses cached successful lookups", async () => {
    let calls = 0;
    mock.method(globalThis, "fetch", async () => {
      calls += 1;
      return new Response(
        JSON.stringify({
          "post code": "90210",
          places: [{ "place name": "Beverly Hills", "state abbreviation": "CA" }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });

    assert.deepEqual(await lookupUsZip("90210-1234"), {
      zip: "90210",
      city: "Beverly Hills",
      state: "CA",
    });
    assert.deepEqual(await lookupUsZip("90210"), {
      zip: "90210",
      city: "Beverly Hills",
      state: "CA",
    });
    assert.equal(calls, 1);
  });
});
