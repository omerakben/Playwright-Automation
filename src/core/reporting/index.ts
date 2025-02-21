export * from './allure.reporter';
export * from './dashboard.generator';
export * from './metrics.collector';

import { AllureReporter } from './allure.reporter';
import { DashboardGenerator } from './dashboard.generator';
import { MetricsCollector } from './metrics.collector';

export default {
  AllureReporter: AllureReporter.getInstance(),
  MetricsCollector: MetricsCollector.getInstance(),
  DashboardGenerator: DashboardGenerator.getInstance(),
};
