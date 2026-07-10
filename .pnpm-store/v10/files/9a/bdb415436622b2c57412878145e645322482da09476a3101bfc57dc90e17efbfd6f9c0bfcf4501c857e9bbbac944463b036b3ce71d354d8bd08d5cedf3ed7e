import { Span } from '@sentry/core';
import { EngineSpan, ExtendedSpanOptions, SpanCallback, TracingHelper } from './types';
type Options = {
    ignoreSpanTypes: (string | RegExp)[];
};
export declare class ActiveTracingHelper implements TracingHelper {
    private ignoreSpanTypes;
    constructor({ ignoreSpanTypes }: Options);
    isEnabled(): boolean;
    getTraceParent(span?: Span): string;
    dispatchEngineSpans(spans: EngineSpan[]): void;
    getActiveContext(): Span | undefined;
    runInChildSpan<R>(nameOrOptions: string | ExtendedSpanOptions, callback: SpanCallback<R>): R;
}
export {};
//# sourceMappingURL=active-tracing-helper.d.ts.map
