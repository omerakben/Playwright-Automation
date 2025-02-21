export * from './scanner';
export * from './vulnerability.analyzer';
export * from './zap.client';

import { SecurityScanner } from './scanner';
import { VulnerabilityAnalyzer } from './vulnerability.analyzer';
import { ZAPClient, ZAPConfig } from './zap.client';

export default {
  createSecurityTesting: (config: ZAPConfig) => ({
    ZAPClient: ZAPClient.getInstance(config),
    SecurityScanner: SecurityScanner.getInstance(config),
    VulnerabilityAnalyzer: VulnerabilityAnalyzer.getInstance(),
  }),
};
