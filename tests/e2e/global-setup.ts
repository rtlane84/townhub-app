import { waitForApiReady } from "./helpers/api";
import { e2eApiUrl, e2eBaseUrl } from "./helpers/env";

export default async function globalSetup(): Promise<void> {
  console.log(`[e2e] Waiting for API at ${e2eApiUrl()}…`);
  await waitForApiReady();
  console.log(`[e2e] API ready. Frontend base URL: ${e2eBaseUrl()}`);
}
