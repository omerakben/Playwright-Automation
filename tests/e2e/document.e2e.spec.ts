import { faker } from '@faker-js/faker';
import { AuthHelper } from '../../src/helpers/business/auth.helper';
import {
  DocumentHelper,
  DocumentStatus,
  DocumentType,
} from '../../src/helpers/business/document.helper';
import { UserRole } from '../../src/helpers/types/business.types';
import { test } from '../fixtures/e2e.fixture';

/**
 * @group document-management
 * @description Tests for document management functionality including upload, review, and archival processes
 */
test.describe('Document Management', () => {
  let authHelper: AuthHelper;
  let documentHelper: DocumentHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    documentHelper = new DocumentHelper(page);

    // Login as admin for document management
    await authHelper.loginAs(UserRole.ADMIN);
  });

  /**
   * @test Upload and manage contract document
   * @description Tests the complete lifecycle of a contract document
   */
  test('should handle contract document lifecycle', async ({ page }) => {
    // Generate test data
    const contractData = {
      title: `Contract-${faker.string.uuid()}`,
      description: faker.lorem.paragraph(),
      tags: ['contract', 'legal', faker.word.sample()],
      department: 'Legal',
      expiryDate: faker.date.future().toISOString().split('T')[0],
    };

    // Upload contract
    const documentId = await documentHelper.uploadDocument(
      DocumentType.CONTRACT,
      './test-data/sample-contract.pdf',
      contractData,
    );

    // Verify document was uploaded
    const searchResults = await documentHelper.searchDocuments({
      type: DocumentType.CONTRACT,
      keyword: contractData.title,
    });
    await test.expect(searchResults).toHaveLength(1);
    await test.expect(searchResults[0].id).toBe(documentId);

    // Start review process
    const reviewers = [faker.internet.email(), faker.internet.email()];
    await documentHelper.startDocumentReview(documentId, reviewers);

    // Switch to reviewer role
    await authHelper.switchRole(UserRole.MANAGER);

    // Review and approve document
    await documentHelper.reviewDocument(documentId, 'approve', 'Contract terms approved');

    // Verify document status
    const updatedResults = await documentHelper.searchDocuments({
      type: DocumentType.CONTRACT,
      status: DocumentStatus.APPROVED,
    });
    await test.expect(updatedResults.some((doc) => doc.id === documentId)).toBeTruthy();
  });

  /**
   * @test Document search and filtering
   * @description Tests advanced document search functionality
   */
  test('should search and filter documents', async () => {
    // Upload multiple test documents
    const documents = await Promise.all([
      documentHelper.uploadDocument(DocumentType.POLICY, './test-data/policy1.pdf', {
        title: 'HR Policy',
        tags: ['hr', 'policy'],
        department: 'HR',
      }),
      documentHelper.uploadDocument(DocumentType.REPORT, './test-data/report1.pdf', {
        title: 'Q1 Report',
        tags: ['finance', 'quarterly'],
        department: 'Finance',
      }),
      documentHelper.uploadDocument(DocumentType.TEMPLATE, './test-data/template1.pdf', {
        title: 'Invoice Template',
        tags: ['finance', 'template'],
        department: 'Finance',
      }),
    ]);

    // Search by department
    const financeDocuments = await documentHelper.searchDocuments({
      department: 'Finance',
    });
    await test.expect(financeDocuments).toHaveLength(2);

    // Search by tag
    const templateDocuments = await documentHelper.searchDocuments({
      tags: ['template'],
    });
    await test.expect(templateDocuments).toHaveLength(1);
    await test.expect(templateDocuments[0].type).toBe(DocumentType.TEMPLATE);

    // Search by date range
    const recentDocuments = await documentHelper.searchDocuments({
      dateRange: {
        start: new Date(Date.now() - 86400000).toISOString().split('T')[0], // Last 24 hours
        end: new Date().toISOString().split('T')[0],
      },
    });
    await test.expect(recentDocuments.length).toBe(3);
  });

  /**
   * @test Document review workflow
   * @description Tests the document review process with multiple reviewers
   */
  test('should handle document review workflow', async () => {
    // Upload document for review
    const documentId = await documentHelper.uploadDocument(
      DocumentType.PROPOSAL,
      './test-data/proposal.pdf',
      {
        title: 'Business Proposal',
        description: 'Proposal for new project',
        tags: ['proposal', 'project'],
        department: 'Business Development',
      },
    );

    // Add multiple reviewers
    const reviewers = [faker.internet.email(), faker.internet.email(), faker.internet.email()];
    await documentHelper.startDocumentReview(documentId, reviewers);

    // Switch roles and review as different users
    for (const [index, reviewer] of reviewers.entries()) {
      await authHelper.switchRole(UserRole.MANAGER);
      const decision = index < 2 ? 'approve' : 'reject';
      await documentHelper.reviewDocument(documentId, decision, `Review comment from ${reviewer}`);
    }

    // Verify final document status
    const documentStatus = await documentHelper.searchDocuments({
      type: DocumentType.PROPOSAL,
      status: DocumentStatus.REJECTED,
    });
    await test.expect(documentStatus).toHaveLength(1);
  });

  /**
   * @test Document archival process
   * @description Tests the document archival functionality
   */
  test('should archive and manage archived documents', async () => {
    // Upload test document
    const documentId = await documentHelper.uploadDocument(
      DocumentType.INVOICE,
      './test-data/invoice.pdf',
      {
        title: 'Old Invoice',
        tags: ['invoice', 'archived'],
        department: 'Finance',
      },
    );

    // Archive document
    await documentHelper.archiveDocument(documentId, 'Invoice processed and paid');

    // Verify document is archived
    const archivedDocuments = await documentHelper.searchDocuments({
      status: DocumentStatus.ARCHIVED,
      type: DocumentType.INVOICE,
    });
    await test.expect(archivedDocuments).toHaveLength(1);
    await test.expect(archivedDocuments[0].id).toBe(documentId);

    // Verify archived document appears in specific searches
    const searchResults = await documentHelper.searchDocuments({
      type: DocumentType.INVOICE,
      department: 'Finance',
      status: DocumentStatus.ARCHIVED,
    });
    await test.expect(searchResults).toHaveLength(1);
  });
});
