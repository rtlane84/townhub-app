import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFile } from "node:fs/promises";

describe("clerk auth appearance", () => {
  it("styles social sign-in buttons with high-contrast text on white", async () => {
    const source = await readFile(new URL("./clerk-appearance.ts", import.meta.url), "utf8");
    assert.match(source, /socialButtonsBlockButton:/);
    assert.match(source, /backgroundColor: "#ffffff"/);
    assert.match(source, /socialButtonsBlockButtonText:/);
    assert.match(source, /color: clerkForeground/);
  });

  it("styles the continue button with white text on primary background", async () => {
    const source = await readFile(new URL("./clerk-appearance.ts", import.meta.url), "utf8");
    assert.match(source, /colorPrimaryForeground/);
    assert.match(source, /formButtonPrimary:/);
    assert.match(source, /formButtonPrimaryText:/);
    assert.match(source, /color: clerkPrimaryForeground/);
  });

  it("adds clerk layer CSS fallback for social buttons", async () => {
    const css = await readFile(new URL("../index.css", import.meta.url), "utf8");
    assert.match(css, /@layer clerk/);
    assert.match(css, /\.cl-socialButtonsBlockButton/);
    assert.match(css, /\.cl-socialButtonsBlockButtonText/);
    assert.match(css, /\.cl-formButtonPrimary/);
  });
});
