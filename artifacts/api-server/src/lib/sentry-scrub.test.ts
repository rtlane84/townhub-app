import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sanitizeSentryEventText, sanitizeSentryText } from "./sentry-scrub";

describe("sanitizeSentryText", () => {
  it("redacts provider identifiers, emails, query values, and database parameters", () => {
    const input =
      "Clerk request for user_123 and sess_456 at person@example.com " +
      "https://clerk.example/v1/client?__clerk_db_jwt=dvb_789&token=secret " +
      "params: user_123,person@example.com,CUSTOMER";

    const sanitized = sanitizeSentryText(input);

    assert.doesNotMatch(sanitized, /user_123|sess_456|dvb_789|person@example\.com|secret/);
    assert.match(sanitized, /params: \[Redacted\]/);
  });

  it("redacts bearer tokens and JWTs", () => {
    const sanitized = sanitizeSentryText(
      "Authorization: Bearer abc.def-123 token eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.signature",
    );

    assert.doesNotMatch(sanitized, /abc\.def-123|eyJhbGci/);
  });
});

describe("sanitizeSentryEventText", () => {
  it("sanitizes grouping fields, stack URLs, and breadcrumb messages", () => {
    const event = {
      message: "Failed for user_123",
      fingerprint: ["user_123", "stable-operation"],
      request: { url: "https://example.com/api?token=secret" },
      logentry: { formatted: "person@example.com" },
      exception: {
        values: [
          {
            value: "Failed query params: user_123,person@example.com",
            stacktrace: {
              frames: [{ filename: "https://example.com/app.js?token=secret" }],
            },
          },
        ],
      },
      breadcrumbs: [{ message: "session sess_456" }],
    };

    sanitizeSentryEventText(event);

    assert.equal(event.message, "Failed for [Redacted]");
    assert.deepEqual(event.fingerprint, ["[Redacted]", "stable-operation"]);
    assert.equal(event.request.url, "https://example.com/api?token=[Redacted]");
    assert.equal(event.exception.values[0].value, "Failed query params: [Redacted]");
    assert.equal(event.exception.values[0].stacktrace.frames[0].filename, "https://example.com/app.js?token=[Redacted]");
    assert.equal(event.breadcrumbs[0].message, "session [Redacted]");
  });
});
