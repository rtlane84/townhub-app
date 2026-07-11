import { InstrumentationConfig } from '@opentelemetry/instrumentation';
import { InstrumentationBase, InstrumentationNodeModuleDefinition } from '@opentelemetry/instrumentation';
export interface PrismaInstrumentationConfig {
    ignoreSpanTypes?: (string | RegExp)[];
}
type Config = PrismaInstrumentationConfig & InstrumentationConfig;
export declare class PrismaInstrumentation extends InstrumentationBase {
    constructor(config?: Config);
    init(): InstrumentationNodeModuleDefinition[];
    enable(): void;
    disable(): void;
    isEnabled(): boolean;
}
export {};
//# sourceMappingURL=instrumentation.d.ts.map
