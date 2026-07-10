import { mysqlChannelIntegration, lruMemoizerChannelIntegration, detectOrchestrionSetup } from '@sentry/server-utils/orchestrion';
import { registerDiagnosticsChannelInjection } from '@sentry/server-utils/orchestrion/register';
import { setDiagnosticsChannelInjectionLoader } from './diagnosticsChannelInjection.js';

function experimentalUseDiagnosticsChannelInjection() {
  setDiagnosticsChannelInjectionLoader(() => {
    const integrations = [mysqlChannelIntegration(), lruMemoizerChannelIntegration()];
    const replacedOtelIntegrationNames = integrations.map((i) => i.name);
    return {
      integrations,
      replacedOtelIntegrationNames,
      register: registerDiagnosticsChannelInjection,
      detect: detectOrchestrionSetup
    };
  });
}

export { experimentalUseDiagnosticsChannelInjection };
//# sourceMappingURL=experimentalUseDiagnosticsChannelInjection.js.map
