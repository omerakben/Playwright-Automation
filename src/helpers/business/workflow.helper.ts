import { Page } from '@playwright/test';
import { logger } from '../../core/logger';
import { WorkflowStatus, WorkflowType } from '../types/business.types';

/**
 * Business workflow helper for common processes
 */
export class WorkflowHelper {
  constructor(private page: Page) {}

  /**
   * Create new workflow
   */
  async createWorkflow(type: WorkflowType, data: any): Promise<string> {
    try {
      // Navigate to workflows
      await this.page.click('[data-testid="workflows-menu"]');

      // Click create new
      await this.page.click('[data-testid="create-workflow"]');

      // Select workflow type
      await this.page.selectOption('[data-testid="workflow-type"]', type);

      // Fill workflow data
      await this.fillWorkflowForm(data);

      // Submit and get workflow ID
      await this.page.click('[data-testid="submit-workflow"]');
      const workflowId = await this.getCreatedWorkflowId();

      logger.info(`Created workflow of type ${type}`, { workflowId });
      return workflowId;
    } catch (error) {
      logger.logError(`Failed to create workflow of type ${type}`, error);
      throw error;
    }
  }

  /**
   * Update workflow status
   */
  async updateWorkflowStatus(workflowId: string, status: WorkflowStatus): Promise<void> {
    try {
      // Navigate to workflow
      await this.page.goto(`/workflows/${workflowId}`);

      // Update status
      await this.page.selectOption('[data-testid="workflow-status"]', status);
      await this.page.click('[data-testid="update-status"]');

      // Verify status update
      await this.verifyWorkflowStatus(workflowId, status);

      logger.info(`Updated workflow ${workflowId} status to ${status}`);
    } catch (error) {
      logger.logError(`Failed to update workflow ${workflowId} status`, error);
      throw error;
    }
  }

  /**
   * Assign workflow
   */
  async assignWorkflow(workflowId: string, userId: string): Promise<void> {
    try {
      // Navigate to workflow
      await this.page.goto(`/workflows/${workflowId}`);

      // Open assignment modal
      await this.page.click('[data-testid="assign-workflow"]');

      // Select user
      await this.page.selectOption('[data-testid="assignee"]', userId);

      // Submit assignment
      await this.page.click('[data-testid="confirm-assignment"]');

      // Verify assignment
      await this.verifyWorkflowAssignment(workflowId, userId);

      logger.info(`Assigned workflow ${workflowId} to user ${userId}`);
    } catch (error) {
      logger.logError(`Failed to assign workflow ${workflowId}`, error);
      throw error;
    }
  }

  /**
   * Add workflow comment
   */
  async addWorkflowComment(workflowId: string, comment: string): Promise<void> {
    try {
      // Navigate to workflow
      await this.page.goto(`/workflows/${workflowId}`);

      // Add comment
      await this.page.fill('[data-testid="comment-input"]', comment);
      await this.page.click('[data-testid="submit-comment"]');

      // Verify comment added
      await this.verifyCommentAdded(workflowId, comment);

      logger.info(`Added comment to workflow ${workflowId}`);
    } catch (error) {
      logger.logError(`Failed to add comment to workflow ${workflowId}`, error);
      throw error;
    }
  }

  /**
   * Get workflow details
   */
  async getWorkflowDetails(workflowId: string): Promise<any> {
    try {
      // Navigate to workflow
      await this.page.goto(`/workflows/${workflowId}`);

      // Get workflow data
      const details = await this.extractWorkflowDetails();

      logger.info(`Retrieved workflow ${workflowId} details`);
      return details;
    } catch (error) {
      logger.logError(`Failed to get workflow ${workflowId} details`, error);
      throw error;
    }
  }

  /**
   * Fill workflow form
   */
  private async fillWorkflowForm(data: any): Promise<void> {
    // Fill basic info
    await this.page.fill('[data-testid="workflow-title"]', data.title);
    await this.page.fill('[data-testid="workflow-description"]', data.description);

    // Fill type-specific fields
    if (data.customFields) {
      for (const [field, value] of Object.entries(data.customFields)) {
        await this.page.fill(`[data-testid="field-${field}"]`, value as string);
      }
    }
  }

  /**
   * Get created workflow ID
   */
  private async getCreatedWorkflowId(): Promise<string> {
    await this.page.waitForURL(/\/workflows\/(\d+)$/);
    const url = this.page.url();
    return url.split('/').pop() || '';
  }

  /**
   * Verify workflow status
   */
  private async verifyWorkflowStatus(workflowId: string, status: WorkflowStatus): Promise<void> {
    const statusElement = await this.page.locator('[data-testid="workflow-status"]');
    await statusElement.waitFor({ state: 'visible' });
    const currentStatus = await statusElement.textContent();
    if (currentStatus !== status) {
      throw new Error(`Expected status ${status} but found ${currentStatus}`);
    }
  }

  /**
   * Verify workflow assignment
   */
  private async verifyWorkflowAssignment(workflowId: string, userId: string): Promise<void> {
    const assigneeElement = await this.page.locator('[data-testid="workflow-assignee"]');
    await assigneeElement.waitFor({ state: 'visible' });
    const assigneeId = await assigneeElement.getAttribute('data-user-id');
    if (assigneeId !== userId) {
      throw new Error(`Expected assignee ${userId} but found ${assigneeId}`);
    }
  }

  /**
   * Verify comment added
   */
  private async verifyCommentAdded(workflowId: string, comment: string): Promise<void> {
    const commentsList = await this.page.locator('[data-testid="comments-list"]');
    await commentsList.waitFor({ state: 'visible' });
    const comments = await commentsList.textContent();
    if (!comments?.includes(comment)) {
      throw new Error('Comment not found in comments list');
    }
  }

  /**
   * Extract workflow details
   */
  private async extractWorkflowDetails(): Promise<any> {
    return {
      id: await this.page.getAttribute('[data-testid="workflow-id"]', 'data-id'),
      title: await this.page.textContent('[data-testid="workflow-title"]'),
      status: await this.page.textContent('[data-testid="workflow-status"]'),
      assignee: await this.page.getAttribute('[data-testid="workflow-assignee"]', 'data-user-id'),
      createdAt: await this.page.getAttribute('[data-testid="workflow-created"]', 'datetime'),
      updatedAt: await this.page.getAttribute('[data-testid="workflow-updated"]', 'datetime'),
      customFields: await this.extractCustomFields(),
    };
  }

  /**
   * Extract custom fields
   */
  private async extractCustomFields(): Promise<Record<string, string>> {
    const fields: Record<string, string> = {};
    const customFields = await this.page.locator('[data-testid^="field-"]').all();

    for (const field of customFields) {
      const id = await field.getAttribute('data-testid');
      if (id) {
        const fieldName = id.replace('field-', '');
        const value = (await field.textContent()) || '';
        fields[fieldName] = value;
      }
    }

    return fields;
  }
}
