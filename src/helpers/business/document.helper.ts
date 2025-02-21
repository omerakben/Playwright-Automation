import { Page } from '@playwright/test';
import { logger } from '../../core/logger';

/**
 * Document types supported by the system
 */
export enum DocumentType {
  CONTRACT = 'CONTRACT',
  INVOICE = 'INVOICE',
  PROPOSAL = 'PROPOSAL',
  REPORT = 'REPORT',
  POLICY = 'POLICY',
  TEMPLATE = 'TEMPLATE',
}

/**
 * Document status in the system
 */
export enum DocumentStatus {
  DRAFT = 'DRAFT',
  PENDING_REVIEW = 'PENDING_REVIEW',
  IN_REVIEW = 'IN_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ARCHIVED = 'ARCHIVED',
}

/**
 * Document management helper for business documents
 */
export class DocumentHelper {
  constructor(private page: Page) {}

  /**
   * Upload new document
   */
  async uploadDocument(
    type: DocumentType,
    filePath: string,
    metadata: {
      title: string;
      description?: string;
      tags?: string[];
      expiryDate?: string;
      department?: string;
    },
  ): Promise<string> {
    try {
      // Navigate to documents
      await this.page.click('[data-testid="documents-menu"]');
      await this.page.click('[data-testid="upload-document"]');

      // Select document type
      await this.page.selectOption('[data-testid="document-type"]', type);

      // Upload file
      const fileInput = this.page.locator('input[type="file"]');
      await fileInput.setInputFiles(filePath);

      // Fill metadata
      await this.page.fill('[data-testid="document-title"]', metadata.title);
      if (metadata.description) {
        await this.page.fill('[data-testid="document-description"]', metadata.description);
      }
      if (metadata.tags) {
        for (const tag of metadata.tags) {
          await this.page.click('[data-testid="add-tag"]');
          await this.page.fill('[data-testid="tag-input"]', tag);
          await this.page.keyboard.press('Enter');
        }
      }
      if (metadata.expiryDate) {
        await this.page.fill('[data-testid="expiry-date"]', metadata.expiryDate);
      }
      if (metadata.department) {
        await this.page.selectOption('[data-testid="department"]', metadata.department);
      }

      // Submit upload
      await this.page.click('[data-testid="submit-upload"]');

      // Get document ID
      const documentId = await this.getUploadedDocumentId();

      logger.info(`Uploaded ${type} document`, { documentId });
      return documentId;
    } catch (error) {
      logger.logError(`Failed to upload ${type} document`, error);
      throw error;
    }
  }

  /**
   * Start document review process
   */
  async startDocumentReview(documentId: string, reviewers: string[]): Promise<void> {
    try {
      // Navigate to document
      await this.page.goto(`/documents/${documentId}`);

      // Start review
      await this.page.click('[data-testid="start-review"]');

      // Add reviewers
      for (const reviewer of reviewers) {
        await this.page.click('[data-testid="add-reviewer"]');
        await this.page.fill('[data-testid="reviewer-input"]', reviewer);
        await this.page.keyboard.press('Enter');
      }

      // Submit review request
      await this.page.click('[data-testid="submit-review"]');

      // Verify status change
      await this.verifyDocumentStatus(documentId, DocumentStatus.PENDING_REVIEW);

      logger.info(`Started review for document ${documentId}`);
    } catch (error) {
      logger.logError(`Failed to start review for document ${documentId}`, error);
      throw error;
    }
  }

  /**
   * Review document
   */
  async reviewDocument(
    documentId: string,
    decision: 'approve' | 'reject',
    comments?: string,
  ): Promise<void> {
    try {
      // Navigate to document
      await this.page.goto(`/documents/${documentId}`);

      // Add review decision
      await this.page.click(`[data-testid="${decision}-document"]`);

      // Add comments if provided
      if (comments) {
        await this.page.fill('[data-testid="review-comments"]', comments);
      }

      // Submit review
      await this.page.click('[data-testid="submit-review"]');

      // Verify status change
      const expectedStatus =
        decision === 'approve' ? DocumentStatus.APPROVED : DocumentStatus.REJECTED;
      await this.verifyDocumentStatus(documentId, expectedStatus);

      logger.info(`Reviewed document ${documentId}`, { decision });
    } catch (error) {
      logger.logError(`Failed to review document ${documentId}`, error);
      throw error;
    }
  }

  /**
   * Archive document
   */
  async archiveDocument(documentId: string, reason?: string): Promise<void> {
    try {
      // Navigate to document
      await this.page.goto(`/documents/${documentId}`);

      // Click archive
      await this.page.click('[data-testid="archive-document"]');

      // Add reason if provided
      if (reason) {
        await this.page.fill('[data-testid="archive-reason"]', reason);
      }

      // Confirm archive
      await this.page.click('[data-testid="confirm-archive"]');

      // Verify status change
      await this.verifyDocumentStatus(documentId, DocumentStatus.ARCHIVED);

      logger.info(`Archived document ${documentId}`);
    } catch (error) {
      logger.logError(`Failed to archive document ${documentId}`, error);
      throw error;
    }
  }

  /**
   * Search documents
   */
  async searchDocuments(criteria: {
    type?: DocumentType;
    status?: DocumentStatus;
    dateRange?: { start: string; end: string };
    tags?: string[];
    department?: string;
    keyword?: string;
  }): Promise<any[]> {
    try {
      // Navigate to documents
      await this.page.click('[data-testid="documents-menu"]');

      // Apply search criteria
      if (criteria.type) {
        await this.page.selectOption('[data-testid="filter-type"]', criteria.type);
      }
      if (criteria.status) {
        await this.page.selectOption('[data-testid="filter-status"]', criteria.status);
      }
      if (criteria.dateRange) {
        await this.page.fill('[data-testid="filter-date-start"]', criteria.dateRange.start);
        await this.page.fill('[data-testid="filter-date-end"]', criteria.dateRange.end);
      }
      if (criteria.tags) {
        for (const tag of criteria.tags) {
          await this.page.click('[data-testid="add-filter-tag"]');
          await this.page.fill('[data-testid="filter-tag-input"]', tag);
          await this.page.keyboard.press('Enter');
        }
      }
      if (criteria.department) {
        await this.page.selectOption('[data-testid="filter-department"]', criteria.department);
      }
      if (criteria.keyword) {
        await this.page.fill('[data-testid="search-keyword"]', criteria.keyword);
      }

      // Apply filters
      await this.page.click('[data-testid="apply-filters"]');

      // Extract search results
      const results = await this.extractDocumentResults();

      logger.info('Document search completed', { resultCount: results.length });
      return results;
    } catch (error) {
      logger.logError('Failed to search documents', error);
      throw error;
    }
  }

  /**
   * Get uploaded document ID
   */
  private async getUploadedDocumentId(): Promise<string> {
    await this.page.waitForURL(/\/documents\/(\d+)$/);
    const url = this.page.url();
    return url.split('/').pop() || '';
  }

  /**
   * Verify document status
   */
  private async verifyDocumentStatus(documentId: string, status: DocumentStatus): Promise<void> {
    const statusElement = await this.page.locator('[data-testid="document-status"]');
    await statusElement.waitFor({ state: 'visible' });
    const currentStatus = await statusElement.textContent();
    if (currentStatus !== status) {
      throw new Error(`Expected status ${status} but found ${currentStatus}`);
    }
  }

  /**
   * Extract document search results
   */
  private async extractDocumentResults(): Promise<any[]> {
    const results: any[] = [];
    const rows = await this.page.locator('[data-testid="document-row"]').all();

    for (const row of rows) {
      results.push({
        id: await row.getAttribute('data-document-id'),
        title: await row.locator('[data-testid="document-title"]').textContent(),
        type: await row.getAttribute('data-document-type'),
        status: await row.getAttribute('data-document-status'),
        uploadedBy: await row.getAttribute('data-uploaded-by'),
        uploadedAt: await row.getAttribute('data-uploaded-at'),
        lastModified: await row.getAttribute('data-last-modified'),
        tags: (await row.getAttribute('data-tags'))?.split(',') || [],
      });
    }

    return results;
  }
}
