const majorVersion = "7";
const GLOBAL_INSTRUMENTATION_KEY = "PRISMA_INSTRUMENTATION";
const GLOBAL_VERSIONED_INSTRUMENTATION_KEY = `V${majorVersion}_PRISMA_INSTRUMENTATION`;
const globalThisWithPrismaInstrumentation = globalThis;
function getGlobalTracingHelper() {
  const versionedGlobal = globalThisWithPrismaInstrumentation[GLOBAL_VERSIONED_INSTRUMENTATION_KEY];
  if (versionedGlobal?.helper) {
    return versionedGlobal.helper;
  }
  const fallbackGlobal = globalThisWithPrismaInstrumentation[GLOBAL_INSTRUMENTATION_KEY];
  return fallbackGlobal?.helper;
}
function setGlobalTracingHelper(helper) {
  const globalValue = { helper };
  globalThisWithPrismaInstrumentation[GLOBAL_VERSIONED_INSTRUMENTATION_KEY] = globalValue;
  globalThisWithPrismaInstrumentation[GLOBAL_INSTRUMENTATION_KEY] = globalValue;
}
function clearGlobalTracingHelper() {
  globalThisWithPrismaInstrumentation[GLOBAL_VERSIONED_INSTRUMENTATION_KEY] = void 0;
  globalThisWithPrismaInstrumentation[GLOBAL_INSTRUMENTATION_KEY] = void 0;
}

export { clearGlobalTracingHelper, getGlobalTracingHelper, setGlobalTracingHelper };
//# sourceMappingURL=global.js.map
