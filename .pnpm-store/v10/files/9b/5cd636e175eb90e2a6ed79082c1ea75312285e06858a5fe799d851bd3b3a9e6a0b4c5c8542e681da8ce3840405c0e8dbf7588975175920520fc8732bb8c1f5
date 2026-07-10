Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const undiciInstrumentation = require('./undici-instrumentation.js');
const core = require('@sentry/core');
const nodeCore = require('@sentry/node-core');

const INTEGRATION_NAME = "NodeFetch";
const instrumentSentryNodeFetch = nodeCore.generateInstrumentOnce(
  `${INTEGRATION_NAME}.sentry`,
  nodeCore.SentryNodeFetchInstrumentation,
  (options) => {
    return options;
  }
);
const _nativeNodeFetchIntegration = ((options = {}) => {
  return {
    name: "NodeFetch",
    setupOnce() {
      const instrumentSpans = _shouldInstrumentSpans(options, core.getClient()?.getOptions());
      if (instrumentSpans) {
        undiciInstrumentation.instrumentUndici({
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
const nativeNodeFetchIntegration = core.defineIntegration(_nativeNodeFetchIntegration);
function _shouldInstrumentSpans(options, clientOptions = {}) {
  return typeof options.spans === "boolean" ? options.spans : !clientOptions.skipOpenTelemetrySetup && core.hasSpansEnabled(clientOptions);
}

exports.nativeNodeFetchIntegration = nativeNodeFetchIntegration;
//# sourceMappingURL=index.js.map
