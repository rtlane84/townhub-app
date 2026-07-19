import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { highlightInputSchema } from "./highlight-input";

describe("highlightInputSchema", () => {
  const base = {
    title: "Town Fair",
    startDate: "2026-07-19",
    endDate: "2026-07-20",
  };

  it("accepts a full create payload", () => {
    const parsed = highlightInputSchema.parse({
      ...base,
      description: "This weekend",
      imageUrl: "https://cdn.example/photo.jpg",
      buttonText: "Learn more",
      buttonUrl: "/events",
      active: true,
      sortOrder: 1,
    });
    assert.equal(parsed.imageUrl, "https://cdn.example/photo.jpg");
    assert.equal(parsed.description, "This weekend");
  });

  it("clears imageUrl when null or empty string is sent", () => {
    assert.equal(
      highlightInputSchema.partial().parse({ imageUrl: null }).imageUrl,
      null,
    );
    assert.equal(
      highlightInputSchema.partial().parse({ imageUrl: "" }).imageUrl,
      null,
    );
    assert.equal(
      highlightInputSchema.partial().parse({ imageUrl: "   " }).imageUrl,
      null,
    );
  });

  it("leaves imageUrl unset when omitted from a partial update", () => {
    const parsed = highlightInputSchema.partial().parse({ title: "Updated" });
    assert.equal(parsed.imageUrl, undefined);
    assert.equal(parsed.title, "Updated");
  });

  it("clears other nullable text fields the same way", () => {
    const parsed = highlightInputSchema.partial().parse({
      description: "",
      buttonText: null,
      buttonUrl: "  ",
    });
    assert.equal(parsed.description, null);
    assert.equal(parsed.buttonText, null);
    assert.equal(parsed.buttonUrl, null);
  });
});
