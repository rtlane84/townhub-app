import type { UndiciInstrumentationConfig } from './types';
/**
 * Instrument outgoing HTTP requests made through `undici` or the global `fetch` API: emit `http.client`
 * spans and propagate traces into the outgoing request headers.
 *
 * undici reports its request lifecycle via `diagnostics_channel`, so rather than patching any module we
 * subscribe to those channels directly. This is idempotent — subsequent calls are no-ops once the
 * channels have been subscribed to, and the config of the first call wins.
 *
 * A combination of https://github.com/elastic/apm-agent-nodejs and
 * https://github.com/gadget-inc/opentelemetry-instrumentations/blob/main/packages/opentelemetry-instrumentation-undici/src/index.ts
 */
export declare function instrumentUndici(config?: UndiciInstrumentationConfig): void;
//# sourceMappingURL=undici-instrumentation.d.ts.map