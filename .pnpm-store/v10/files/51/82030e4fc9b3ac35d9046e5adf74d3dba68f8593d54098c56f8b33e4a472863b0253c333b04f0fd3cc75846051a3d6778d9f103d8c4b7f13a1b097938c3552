import { instrumentUndici } from './undici-instrumentation.js';
import { defineIntegration, getClient, hasSpansEnabled } from '@sentry/core';
import { generateInstrumentOnce, SentryNodeFetchInstrumentation } from '@sentry/node-core';

const INTEGRATION_NAME = "NodeFetch";
const instrumentSentryNodeFetch = generateInstrumentOnce(
  `${INTEGRATION_NAME}.sentry`,
  SentryNodeFetchInstrumentation,
  (options) => {
    return options;
  }
);
const _nativeNodeFetchIntegration = ((options = {}) => {
  return {
    name: "NodeFetch",
    setupOnce() {
      const instrumentSpans = _shouldInstrumentSpans(options, getClient()?.getOptions());
      if (instrumentSpans) {
        instrumentUndici({
          ignoreOutgoingRequests: options.ignoreOutgoingRequests,
          requestHook: options.requestHook,
          responseHook: options.responseHook,
          headersToSpanAttributes: options.headersToSpanAttributes
        });
      }
      instrumentSentryNodeFetch(options);
    }
  };
});
const nativeNodeFetchIntegration = defineIntegration(_nativeNodeFetchIntegration);
function _shouldInstrumentSpans(options, clientOptions = {}) {
  return typeof options.spans === "boolean" ? options.spans : !clientOptions.skipOpenTelemetrySetup && hasSpansEnabled(clientOptions);
}

export { nativeNodeFetchIntegration };
//# sourceMappingURL=index.js.map
