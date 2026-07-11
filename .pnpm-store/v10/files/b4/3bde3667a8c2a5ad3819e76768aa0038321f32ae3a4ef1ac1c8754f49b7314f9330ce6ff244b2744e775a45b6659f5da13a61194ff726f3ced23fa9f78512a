import { InstrumentationBase, InstrumentationNodeModuleDefinition } from '@opentelemetry/instrumentation';
import { ActiveTracingHelper } from './active-tracing-helper.js';
import { NAME, VERSION, MODULE_NAME, SUPPORTED_MODULE_VERSIONS } from './constants.js';
import { setGlobalTracingHelper, clearGlobalTracingHelper, getGlobalTracingHelper } from './global.js';

class PrismaInstrumentation extends InstrumentationBase {
  constructor(config = {}) {
    super(NAME, VERSION, config);
  }
  init() {
    const module = new InstrumentationNodeModuleDefinition(MODULE_NAME, SUPPORTED_MODULE_VERSIONS);
    return [module];
  }
  enable() {
    const config = this._config;
    setGlobalTracingHelper(
      new ActiveTracingHelper({
        ignoreSpanTypes: config.ignoreSpanTypes ?? []
      })
    );
  }
  disable() {
    clearGlobalTracingHelper();
  }
  isEnabled() {
    return getGlobalTracingHelper() !== void 0;
  }
}

export { PrismaInstrumentation };
//# sourceMappingURL=instrumentation.js.map
