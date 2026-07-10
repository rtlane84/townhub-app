Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const core = require('@sentry/core');

const showAllTraces = process.env.PRISMA_SHOW_ALL_TRACES === "true";
const nonSampledTraceParent = `00-10-10-00`;
const PRISMA_ORIGIN = "auto.db.otel.prisma";
function buildSpanAttributes(name, attributes) {
  const merged = {
    ...attributes,
    [core.SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: PRISMA_ORIGIN
  };
  if (name === "prisma:engine:db_query" && merged["db.system"] == null) {
    merged["db.system"] = "prisma";
  }
  return merged;
}
function buildSpanName(name, attributes) {
  const queryText = attributes["db.query.text"];
  if ((name === "prisma:engine:db_query" || name === "prisma:client:db_query") && typeof queryText === "string") {
    return queryText;
  }
  return name;
}
class ActiveTracingHelper {
  constructor({ ignoreSpanTypes }) {
    this.ignoreSpanTypes = ignoreSpanTypes;
  }
  isEnabled() {
    return true;
  }
  getTraceParent(span) {
    const spanContext = (span ?? core.getActiveSpan())?.spanContext();
    if (spanContext) {
      return `00-${spanContext.traceId}-${spanContext.spanId}-0${spanContext.traceFlags}`;
    }
    return nonSampledTraceParent;
  }
  dispatchEngineSpans(spans) {
    const linkIds = /* @__PURE__ */ new Map();
    const roots = spans.filter((span) => span.parentId === null);
    for (const root of roots) {
      dispatchEngineSpan(root, spans, linkIds, this.ignoreSpanTypes);
    }
  }
  getActiveContext() {
    return core.getActiveSpan();
  }
  runInChildSpan(nameOrOptions, callback) {
    const options = typeof nameOrOptions === "string" ? { name: nameOrOptions } : nameOrOptions;
    if (options.internal && !showAllTraces) {
      return callback();
    }
    const name = `prisma:client:${options.name}`;
    if (shouldIgnoreSpan(name, this.ignoreSpanTypes)) {
      return callback();
    }
    const parentSpan = core.getActiveSpan();
    const attributes = buildSpanAttributes(name, options.attributes);
    const spanOptions = {
      name: buildSpanName(name, attributes),
      attributes,
      kind: options.kind,
      links: options.links,
      startTime: options.startTime,
      parentSpan
    };
    if (options.active === false) {
      const span = core.startInactiveSpan(spanOptions);
      return endSpan(span, () => callback(span, parentSpan));
    }
    return core.startSpanManual(spanOptions, (span) => endSpan(span, () => callback(span, parentSpan)));
  }
}
function dispatchEngineSpan(engineSpan, allSpans, linkIds, ignoreSpanTypes) {
  if (shouldIgnoreSpan(engineSpan.name, ignoreSpanTypes)) {
    return;
  }
  const attributes = buildSpanAttributes(engineSpan.name, engineSpan.attributes);
  core.startSpanManual(
    {
      name: buildSpanName(engineSpan.name, attributes),
      attributes,
      kind: engineSpan.kind === "client" ? core.SPAN_KIND.CLIENT : core.SPAN_KIND.INTERNAL,
      startTime: engineSpan.startTime
    },
    (span) => {
      linkIds.set(engineSpan.id, span.spanContext().spanId);
      if (engineSpan.links) {
        span.addLinks(
          engineSpan.links.flatMap((link) => {
            const linkedId = linkIds.get(link);
            if (!linkedId) {
              return [];
            }
            return {
              context: {
                spanId: linkedId,
                traceId: span.spanContext().traceId,
                traceFlags: span.spanContext().traceFlags
              }
            };
          })
        );
      }
      const children = allSpans.filter((s) => s.parentId === engineSpan.id);
      for (const child of children) {
        dispatchEngineSpan(child, allSpans, linkIds, ignoreSpanTypes);
      }
      span.end(engineSpan.endTime);
    }
  );
}
function endSpan(span, run) {
  let result;
  try {
    result = run();
  } catch (reason) {
    span.end();
    throw reason;
  }
  if (isPromiseLike(result)) {
    return result.then(
      (value) => {
        span.end();
        return value;
      },
      (reason) => {
        span.end();
        throw reason;
      }
    );
  }
  span.end();
  return result;
}
function isPromiseLike(value) {
  return value != null && typeof value["then"] === "function";
}
function shouldIgnoreSpan(spanName, ignoreSpanTypes) {
  return ignoreSpanTypes.some((pattern) => typeof pattern === "string" ? pattern === spanName : pattern.test(spanName));
}

exports.ActiveTracingHelper = ActiveTracingHelper;
//# sourceMappingURL=active-tracing-helper.js.map
