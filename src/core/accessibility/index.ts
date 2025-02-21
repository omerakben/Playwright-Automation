export * from './checker';
export * from './report.generator';

import { AccessibilityChecker } from './checker';
import { AccessibilityReportGenerator } from './report.generator';

export default {
  AccessibilityChecker: AccessibilityChecker.getInstance(),
  AccessibilityReportGenerator: AccessibilityReportGenerator.getInstance(),
};
