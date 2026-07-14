import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveDistributionChannel } from "./distribution-channel.ts";

describe("distribution channel", () => {
  it("defaults browser deployments to web", () => {
    assert.equal(resolveDistributionChannel(undefined, false), "web");
    assert.equal(resolveDistributionChannel("unexpected", false), "web");
  });

  it("recognizes explicit store builds", () => {
    assert.equal(resolveDistributionChannel("app-store", false), "app-store");
    assert.equal(resolveDistributionChannel("play-store", false), "play-store");
  });

  it("fails closed for native builds when the build variable is missing", () => {
    assert.equal(resolveDistributionChannel(undefined, true), "app-store");
  });
});
