import { getAsyncContextStrategy, getMainCarrier, debug, captureException, SPAN_STATUS_ERROR } from '@sentry/core';
import { DEBUG_BUILD } from './debug-build.js';
import { ERROR_TYPE } from '@sentry/conventions/attributes';

const NOOP = () => {
};
function bindTracingChannelToSpan(channel, getSpan, opts) {
  const handle = bindSpanToChannelStore(channel, getSpan);
  const beforeSpanEnd = opts?.beforeSpanEnd;
  const deferSpanEnd = opts?.deferSpanEnd;
  const getErrorHint = (e) => {
    if (typeof opts?.captureError === "function") {
      return opts.captureError(e);
    }
    return {
      mechanism: {
        type: "auto.diagnostic_channels.bind_span",
        handled: false
      }
    };
  };
  const annotateSpanError = (span, error) => {
    if (opts?.captureError) {
      captureException(error, getErrorHint(error));
    }
    const { message, attributes } = getErrorInfo(error);
    span.setStatus({ code: SPAN_STATUS_ERROR, message });
    span.setAttributes(attributes);
  };
  const makeDeferredEnd = (span, data) => {
    let ended = false;
    return (error) => {
      if (ended) {
        return;
      }
      ended = true;
      if (error !== void 0) {
        annotateSpanError(span, error);
      }
      endBoundSpan(data, beforeSpanEnd);
    };
  };
  const subscribers = {
    start: NOOP,
    asyncStart: NOOP,
    end(data) {
      if ("error" in data || "result" in data) {
        const span = data._sentrySpan;
        if (span && deferSpanEnd?.({ span, data, end: makeDeferredEnd(span, data) })) {
          return;
        }
        endBoundSpan(data, beforeSpanEnd);
      }
    },
    error(data) {
      const span = data._sentrySpan;
      if (!span) {
        return;
      }
      annotateSpanError(span, data.error);
    },
    asyncEnd(data) {
      const span = data._sentrySpan;
      if (span && deferSpanEnd?.({ span, data, end: makeDeferredEnd(span, data) })) {
        return;
      }
      endBoundSpan(data, beforeSpanEnd);
    }
  };
  handle.channel.subscribe(subscribers);
  return {
    channel: handle.channel,
    unbind: () => {
      handle.channel.unsubscribe(subscribers);
      handle.unbind();
    }
  };
}
function bindSpanToChannelStore(channel, getSpan) {
  const binding = getAsyncContextStrategy(getMainCarrier()).getTracingChannelBinding?.();
  if (!binding) {
    DEBUG_BUILD && debug.log("[TracingChannel] Could not access async context binding.");
    return {
      channel,
      unbind: NOOP
    };
  }
  const asyncLocalStorage = binding.asyncLocalStorage;
  channel.start.bindStore(asyncLocalStorage, (data) => {
    data._sentryCallerStore = asyncLocalStorage.getStore();
    const span = getSpan(data);
    if (!span) {
      return data._sentryCallerStore;
    }
    data._sentrySpan = span;
    return binding.getStoreWithActiveSpan(span);
  });
  channel.asyncStart.bindStore(asyncLocalStorage, (data) => {
    return data._sentryCallerStore;
  });
  return {
    channel,
    unbind: () => {
      channel.start.unbindStore(asyncLocalStorage);
      channel.asyncStart.unbindStore(asyncLocalStorage);
    }
  };
}
function endBoundSpan(data, beforeSpanEnd) {
  const span = data._sentrySpan;
  if (!span) {
    return;
  }
  beforeSpanEnd?.(span, data);
  span.end();
}
function getErrorInfo(error) {
  const isObject = !!error && typeof error === "object";
  const raw = isObject ? "message" in error ? error.message : void 0 : error;
  const message = raw ? String(raw) : "unknown_error";
  const type = isObject && "name" in error ? String(error.name) : "unknown";
  return {
    message,
    attributes: {
      [ERROR_TYPE]: type
    }
  };
}

export { bindTracingChannelToSpan };
//# sourceMappingURL=tracing-channel.js.map
