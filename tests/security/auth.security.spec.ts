import { expect, test } from '../fixtures/security.fixture';

test.describe('Authentication Security', () => {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

  test('should scan for authentication vulnerabilities', async ({ securityUtils }) => {
    // Run security scan focused on authentication endpoints
    const scanResult = await securityUtils.runSecurityScan(baseUrl, {
      contextFile: './security/contexts/auth-context.json',
      alertThreshold: {
        high: 0, // No high-risk vulnerabilities allowed
        medium: 2, // Maximum 2 medium-risk vulnerabilities
        low: 5, // Maximum 5 low-risk vulnerabilities
      },
    });

    // Analyze vulnerabilities
    const report = await securityUtils.analyzeVulnerabilities(scanResult, {
      includeEvidence: true,
      includeSolution: true,
      groupByRisk: true,
    });

    // Generate report
    await securityUtils.generateReport(report, 'test-results/security/auth');

    // Verify security requirements
    const riskScore = securityUtils.calculateRiskScore(report.vulnerabilities);
    expect(riskScore).toBeLessThan(50); // Maximum acceptable risk score

    // Verify no critical authentication vulnerabilities
    const authVulnerabilities = report.vulnerabilities.filter(
      (v) => v.category === 'Authentication' || v.category === 'Session Management',
    );

    expect(authVulnerabilities.filter((v) => v.risk === 'high')).toHaveLength(0);
  });

  test('should verify password policy enforcement', async ({ securityUtils }) => {
    const scanResult = await securityUtils.runSecurityScan(`${baseUrl}/auth/register`, {
      spiderScan: false,
      activeScan: true,
      maxDuration: 1800000, // 30 minutes
      alertThreshold: {
        high: 0,
      },
    });

    // Analyze password policy vulnerabilities
    const report = await securityUtils.analyzeVulnerabilities(scanResult);

    const passwordVulnerabilities = report.vulnerabilities.filter(
      (v) => v.category === 'Password Policy',
    );

    // Verify password policy requirements
    expect(passwordVulnerabilities).toHaveLength(0);
  });

  test('should check for brute force protection', async ({ securityUtils }) => {
    const scanResult = await securityUtils.runSecurityScan(`${baseUrl}/auth/login`, {
      spiderScan: false,
      activeScan: true,
      maxDuration: 1800000,
    });

    // Analyze brute force vulnerabilities
    const report = await securityUtils.analyzeVulnerabilities(scanResult);

    const bruteForceVulnerabilities = report.vulnerabilities.filter(
      (v) => v.category === 'Brute Force' || v.category === 'Rate Limiting',
    );

    // Verify brute force protection
    expect(bruteForceVulnerabilities.filter((v) => v.risk === 'high')).toHaveLength(0);
    expect(bruteForceVulnerabilities.filter((v) => v.risk === 'medium')).toHaveLength(0);
  });

  test('should verify session security', async ({ securityUtils }) => {
    const scanResult = await securityUtils.runSecurityScan(`${baseUrl}/auth`, {
      contextFile: './security/contexts/session-context.json',
    });

    // Analyze session security vulnerabilities
    const report = await securityUtils.analyzeVulnerabilities(scanResult);

    const sessionVulnerabilities = report.vulnerabilities.filter(
      (v) =>
        v.category === 'Session Management' ||
        v.category === 'Session Fixation' ||
        v.category === 'Session Timeout',
    );

    // Group vulnerabilities by risk
    const vulnerabilitiesByRisk = securityUtils.groupByRisk(sessionVulnerabilities);

    // Verify session security requirements
    expect(vulnerabilitiesByRisk.high || []).toHaveLength(0);
    expect(vulnerabilitiesByRisk.medium || []).toHaveLength(0);
  });

  test('should check for secure password reset', async ({ securityUtils }) => {
    const scanResult = await securityUtils.runSecurityScan(`${baseUrl}/auth/reset-password`, {
      spiderScan: false,
      activeScan: true,
    });

    // Analyze password reset vulnerabilities
    const report = await securityUtils.analyzeVulnerabilities(scanResult);

    // Filter relevant vulnerabilities
    const resetVulnerabilities = securityUtils.filterVulnerabilities(report.vulnerabilities, {
      categories: ['Password Reset', 'Token Security'],
      minRisk: 'medium',
    });

    // Verify password reset security
    expect(resetVulnerabilities).toHaveLength(0);
  });
});
