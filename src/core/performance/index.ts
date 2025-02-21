export * from './k6.generator';
export * from './metrics.collector';
export * from './test.runner';

import { K6ScriptGenerator } from './k6.generator';
import { MetricsCollector } from './metrics.collector';
import { PerformanceTestRunner } from './test.runner';

export default {
  K6ScriptGenerator: K6ScriptGenerator.getInstance(),
  PerformanceTestRunner: PerformanceTestRunner.getInstance(),
  MetricsCollector: MetricsCollector.getInstance(),
};
