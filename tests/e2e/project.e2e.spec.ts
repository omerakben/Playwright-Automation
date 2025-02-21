import { ProjectListPage } from '../../src/pages/project-list.page';
import { ProjectPage } from '../../src/pages/project.page';
import { projectFactory, projectHelpers } from '../factories/project.factory';
import { userFactory, userHelpers } from '../factories/user.factory';
import { expect, test } from '../fixtures/e2e.fixture';

test.describe('Project Management', () => {
  let projectPage: ProjectPage;
  let projectListPage: ProjectListPage;
  let testUser: any;
  let testProject: any;

  test.beforeEach(async ({ page }) => {
    // Create test user and project
    testUser = await userHelpers.createAdmin(userFactory);
    testProject = await projectHelpers.createWithMembers(projectFactory, 3);

    // Initialize pages
    projectPage = new ProjectPage(page);
    projectListPage = new ProjectListPage(page);

    // Login and navigate to projects
    await loginAsUser(page, testUser);
    await projectListPage.goto();
  });

  test('should create new project', async ({ page, components }) => {
    // Click create project button
    await projectListPage.clickCreateProject();

    // Fill project form
    const form = components.createForm('#project-form');
    await form.fill({
      name: 'Test Project',
      description: 'Test project description',
      startDate: '2024-03-01',
      endDate: '2024-12-31',
    });

    // Submit form
    await form.submit();
    await page.waitForURL(/\/projects\/\d+/);

    // Verify project details
    await expect(projectPage.getProjectName()).toHaveText('Test Project');
    await expect(projectPage.getProjectDescription()).toHaveText('Test project description');
    await expect(projectPage.getProjectDates()).toContainText(['Mar 1, 2024', 'Dec 31, 2024']);
  });

  test('should edit project details', async ({ page, components }) => {
    // Navigate to test project
    await projectListPage.openProject(testProject.id);

    // Click edit button
    await projectPage.clickEdit();

    // Update project details
    const form = components.createForm('#project-form');
    await form.fill({
      name: 'Updated Project',
      description: 'Updated description',
    });

    // Save changes
    await form.submit();

    // Verify updates
    await expect(projectPage.getProjectName()).toHaveText('Updated Project');
    await expect(projectPage.getProjectDescription()).toHaveText('Updated description');

    // Verify audit log
    const auditLog = projectPage.getAuditLog();
    await expect(auditLog.getLastEntry()).toContainText('Project details updated');
  });

  test('should manage project members', async ({ page, components }) => {
    // Navigate to test project
    await projectListPage.openProject(testProject.id);

    // Open members modal
    await projectPage.openMembersModal();

    // Add new member
    const newMember = await userFactory.create();
    const memberForm = components.createForm('#add-member-form');
    await memberForm.fill({
      email: newMember.email,
      role: 'developer',
    });
    await memberForm.submit();

    // Verify member added
    const membersList = projectPage.getMembersList();
    await expect(membersList).toContainText(newMember.email);

    // Remove a member
    await projectPage.removeMember(testProject.members[0].id);
    await expect(membersList).not.toContainText(testProject.members[0].email);
  });

  test('should handle project status changes', async ({ page }) => {
    // Navigate to test project
    await projectListPage.openProject(testProject.id);

    // Archive project
    await projectPage.changeStatus('archived');
    await expect(projectPage.getStatusBadge()).toHaveText('Archived');
    await expect(projectPage.getStatusBadge()).toHaveClass(/bg-gray/);

    // Verify confirmation modal
    const modal = page.locator('.confirmation-modal');
    await expect(modal).toContainText('Project archived successfully');

    // Reactivate project
    await projectPage.changeStatus('active');
    await expect(projectPage.getStatusBadge()).toHaveText('Active');
    await expect(projectPage.getStatusBadge()).toHaveClass(/bg-green/);
  });

  test('should filter and sort projects', async ({ components }) => {
    // Create additional test projects
    await projectHelpers.createArchived(projectFactory, { name: 'Archived Project' });
    await projectHelpers.createDraft(projectFactory, { name: 'Draft Project' });

    // Create filter form
    const filterForm = components.createForm('#project-filters');
    await filterForm.fill({
      status: 'archived',
    });

    // Verify filtered results
    const projectTable = components.createTable('#projects-table', [
      { name: 'Name', selector: 'td:nth-child(1)' },
      { name: 'Status', selector: 'td:nth-child(2)' },
    ]);

    const results = await projectTable.getAllData();
    expect(results.every((p) => p.status === 'Archived')).toBe(true);
    expect(results).toHaveLength(1);

    // Test sorting
    await projectTable.sortBy('name');
    const sortedResults = await projectTable.getAllData();
    expect(sortedResults).toBeSortedBy('name');
  });

  test('should handle project deletion', async ({ page }) => {
    // Navigate to test project
    await projectListPage.openProject(testProject.id);

    // Delete project
    await projectPage.deleteProject();

    // Verify confirmation modal
    const modal = components.createModal('.confirmation-modal');
    await expect(modal).toContainText('Are you sure you want to delete this project?');

    // Confirm deletion
    await modal.clickPrimaryAction();

    // Verify redirect and project removed
    await expect(page).toHaveURL('/projects');
    await expect(projectListPage.getProjectCard(testProject.id)).not.toBeVisible();
  });

  test('should validate project form', async ({ components }) => {
    // Click create project button
    await projectListPage.clickCreateProject();

    // Submit empty form
    const form = components.createForm('#project-form');
    await form.submit();

    // Verify validation messages
    await expect(form.getErrorMessage('name')).toHaveText('Project name is required');
    await expect(form.getErrorMessage('startDate')).toHaveText('Start date is required');
    await expect(form.getErrorMessage('endDate')).toHaveText('End date is required');

    // Test invalid date range
    await form.fill({
      name: 'Test Project',
      startDate: '2024-12-31',
      endDate: '2024-01-01',
    });
    await form.submit();

    await expect(form.getErrorMessage('endDate')).toHaveText('End date must be after start date');
  });

  test('should handle project settings', async ({ page, components }) => {
    // Navigate to test project
    await projectListPage.openProject(testProject.id);

    // Open settings
    await projectPage.openSettings();

    // Update settings
    const settingsForm = components.createForm('#project-settings');
    await settingsForm.fill({
      visibility: 'private',
      allowGuestAccess: false,
      notifyOnChanges: true,
    });
    await settingsForm.submit();

    // Verify settings saved
    await expect(page.locator('.toast-success')).toContainText('Settings saved successfully');

    // Verify settings applied
    await page.reload();
    await projectPage.openSettings();
    await expect(settingsForm.getField('visibility')).toHaveValue('private');
    await expect(settingsForm.getField('allowGuestAccess')).not.toBeChecked();
    await expect(settingsForm.getField('notifyOnChanges')).toBeChecked();
  });
});
