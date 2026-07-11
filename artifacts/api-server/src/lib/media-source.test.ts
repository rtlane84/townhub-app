import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  resolveLocalStoredFilenameFromUrl,
  resolveSupabaseStoragePathFromUrl,
} from "./media-source.ts";

describe("media-source", () => {
  it("resolves Supabase public media paths", () => {
    const path = resolveSupabaseStoragePathFromUrl(
      "https://project.supabase.co/storage/v1/object/public/media/platform/hero%20image.png",
      "https://project.supabase.co",
      "media",
    );
    assert.equal(path, "platform/hero image.png");
  });

  it("resolves local media file URLs", () => {
    assert.equal(
      resolveLocalStoredFilenameFromUrl("/api/media/files/abc-123.png"),
      "abc-123.png",
    );
    assert.equal(resolveLocalStoredFilenameFromUrl("/api/media/files/../secret.png"), null);
  });
});
