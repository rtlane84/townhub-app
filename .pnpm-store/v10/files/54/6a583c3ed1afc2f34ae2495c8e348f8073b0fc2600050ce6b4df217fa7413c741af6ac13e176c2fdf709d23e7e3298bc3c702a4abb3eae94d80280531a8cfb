import type { SpanOptions } from '@opentelemetry/api';
import type { Span } from '@sentry/core';
export type SpanCallback<R> = (span?: Span, parentSpan?: Span) => R;
export interface ExtendedSpanOptions extends SpanOptions {
    /** The name of the span */
    name: string;
    internal?: boolean;
    /** Whether it propagates context (?=true) */
    active?: boolean;
}
export type EngineSpanId = string;
export type HrTime = [number, number];
export type EngineSpanKind = 'client' | 'internal';
export type EngineSpan = {
    id: EngineSpanId;
    parentId: string | null;
    name: string;
    startTime: HrTime;
    endTime: HrTime;
    kind: EngineSpanKind;
    attributes?: Record<string, unknown>;
    links?: EngineSpanId[];
};
export interface TracingHelper {
    isEnabled(): boolean;
    getTraceParent(span?: Span): string;
    dispatchEngineSpans(spans: EngineSpan[]): void;
    getActiveContext(): Span | undefined;
    runInChildSpan<R>(nameOrOptions: string | ExtendedSpanOptions, callback: SpanCallback<R>): R;
}
export interface PrismaInstrumentationGlobalValue {
    helper?: TracingHelper;
}
//# sourceMappingURL=types.d.ts.map