import { expect, test } from '../fixtures/security.fixture';

test.describe('API Security', () => {
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000/api';

  test('should scan for API vulnerabilities', async ({ securityUtils }) => {
    // Run security scan focused on API endpoints
    const scanResult = await securityUtils.runSecurityScan(baseUrl, {
      contextFile: './security/contexts/api-context.json',
      alertThreshold: {
        high: 0, // No high-risk vulnerabilities allowed
        medium: 3, // Maximum 3 medium-risk vulnerabilities
        low: 8, // Maximum 8 low-risk vulnerabilities
      },
    });

    // Analyze vulnerabilities
    const report = await securityUtils.analyzeVulnerabilities(scanResult, {
      includeEvidence: true,
      includeSolution: true,
      groupByRisk: true,
    });

    // Generate report
    await securityUtils.generateReport(report, 'test-results/security/api');

    // Verify API security requirements
    const apiVulnerabilities = report.vulnerabilities.filter(
      (v) =>
        v.category === 'API Security' ||
        v.category === 'Input Validation' ||
        v.category === 'Access Control',
    );

    expect(apiVulnerabilities.filter((v) => v.risk === 'high')).toHaveLength(0);
    expect(apiVulnerabilities.filter((v) => v.risk === 'medium').length).toBeLessThanOrEqual(3);
  });

  test('should verify API authentication', async ({ securityUtils }) => {
    const scanResult = await securityUtils.runSecurityScan(`${baseUrl}/secure`, {
      spiderScan: false,
      activeScan: true,
      maxDuration: 1800000, // 30 minutes
    });

    // Analyze authentication vulnerabilities
    const report = await securityUtils.analyzeVulnerabilities(scanResult);

    const authVulnerabilities = report.vulnerabilities.filter(
      (v) =>
        v.category === 'Authentication' ||
        v.category === 'JWT Security' ||
        v.category === 'OAuth Security',
    );

    // Group by risk level
    const vulnerabilitiesByRisk = securityUtils.groupByRisk(authVulnerabilities);

    // Verify authentication security
    expect(vulnerabilitiesByRisk.high || []).toHaveLength(0);
    expect(vulnerabilitiesByRisk.medium || []).toHaveLength(0);
  });

  test('should check for injection vulnerabilities', async ({ securityUtils }) => {
    const scanResult = await securityUtils.runSecurityScan(baseUrl, {
      spiderScan: true,
      activeScan: true,
      maxDuration: 3600000, // 1 hour
    });

    // Analyze injection vulnerabilities
    const report = await securityUtils.analyzeVulnerabilities(scanResult);

    // Filter injection vulnerabilities
    const injectionVulnerabilities = securityUtils.filterVulnerabilities(report.vulnerabilities, {
      categories: ['SQL Injection', 'NoSQL Injection', 'Command Injection', 'XSS', 'XXE'],
      minRisk: 'medium',
    });

    // Verify no injection vulnerabilities
    expect(injectionVulnerabilities).toHaveLength(0);
  });

  test('should verify API access control', async ({ securityUtils }) => {
    const scanResult = await securityUtils.runSecurityScan(baseUrl, {
      contextFile: './security/contexts/rbac-context.json',
    });

    // Analyze access control vulnerabilities
    const report = await securityUtils.analyzeVulnerabilities(scanResult);

    const accessControlVulnerabilities = report.vulnerabilities.filter(
      (v) =>
        v.category === 'Access Control' || v.category === 'Authorization' || v.category === 'CORS',
    );

    // Verify access control security
    expect(accessControlVulnerabilities.filter((v) => v.risk === 'high')).toHaveLength(0);
    expect(accessControlVulnerabilities.filter((v) => v.risk === 'medium')).toHaveLength(0);
  });

  test('should check for sensitive data exposure', async ({ securityUtils }) => {
    const scanResult = await securityUtils.runSecurityScan(baseUrl, {
      spiderScan: true,
      activeScan: true,
    });

    // Analyze data exposure vulnerabilities
    const report = await securityUtils.analyzeVulnerabilities(scanResult);

    // Filter sensitive data vulnerabilities
    const dataVulnerabilities = securityUtils.filterVulnerabilities(report.vulnerabilities, {
      categories: ['Information Disclosure', 'Sensitive Data Exposure', 'Error Handling'],
      minRisk: 'low',
    });

    // Calculate risk score for data vulnerabilities
    const riskScore = securityUtils.calculateRiskScore(dataVulnerabilities);
    expect(riskScore).toBeLessThan(30); // Maximum acceptable risk score for data exposure
  });
});
