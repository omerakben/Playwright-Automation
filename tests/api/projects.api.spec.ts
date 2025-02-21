import Joi from 'joi';
import { AuthType } from '../../src/core/api/auth.handler';
import { projectFactory, projectHelpers } from '../factories/project.factory';
import { userFactory, userHelpers } from '../factories/user.factory';
import { expect, test } from '../fixtures/api.fixture';

test.describe('Projects API', () => {
  const projectSchema = Joi.object({
    id: Joi.number().required(),
    name: Joi.string().required(),
    description: Joi.string().allow(null),
    status: Joi.string().valid('active', 'archived', 'draft').required(),
    ownerId: Joi.number().required(),
    startDate: Joi.date().iso().allow(null),
    endDate: Joi.date().iso().allow(null),
    createdAt: Joi.date().iso().required(),
    updatedAt: Joi.date().iso().required(),
  });

  let authToken: string;
  let testUser: any;

  test.beforeEach(async ({ apiUtils }) => {
    // Create test user and get token
    testUser = await userHelpers.createAdmin(userFactory);
    authToken = await apiUtils.getAuthToken(AuthType.Bearer, {
      username: testUser.username,
      password: testUser.password,
    });
  });

  test('should create project', async ({ api, apiUtils }) => {
    const projectData = {
      name: 'Test Project',
      description: 'Test Description',
      status: 'active',
      startDate: '2024-03-01',
      endDate: '2024-12-31',
    };

    const response = await api.post('/projects', projectData, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(response.status).toBe(201);
    apiUtils.validateResponse(response.data, projectSchema);
    expect(response.data.name).toBe(projectData.name);
    expect(response.data.ownerId).toBe(testUser.id);
  });

  test('should get project by ID', async ({ api, apiUtils }) => {
    // Create test project
    const project = await projectFactory.create({ ownerId: testUser.id });

    const response = await api.get(`/projects/${project.id}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(response.status).toBe(200);
    apiUtils.validateResponse(response.data, projectSchema);
  });

  test('should update project', async ({ api, apiUtils }) => {
    // Create test project
    const project = await projectFactory.create({ ownerId: testUser.id });

    const updateData = {
      name: 'Updated Project',
      description: 'Updated Description',
    };

    const response = await api.put(`/projects/${project.id}`, updateData, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(response.status).toBe(200);
    apiUtils.validateResponse(response.data, projectSchema);
    expect(response.data.name).toBe(updateData.name);
    expect(response.data.description).toBe(updateData.description);
  });

  test('should delete project', async ({ api }) => {
    // Create test project
    const project = await projectFactory.create({ ownerId: testUser.id });

    const response = await api.delete(`/projects/${project.id}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(response.status).toBe(204);

    // Verify project is deleted
    const getResponse = await api
      .get(`/projects/${project.id}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      })
      .catch((r) => r.response);

    expect(getResponse.status).toBe(404);
  });

  test('should list projects with filters', async ({ api, apiUtils }) => {
    // Create test projects
    await projectHelpers.createArchived(projectFactory, { ownerId: testUser.id });
    await projectHelpers.createDraft(projectFactory, { ownerId: testUser.id });
    await projectFactory.create({ ownerId: testUser.id });

    // Get filtered projects
    const response = await api.get('/projects', {
      headers: { Authorization: `Bearer ${authToken}` },
      params: {
        status: 'archived',
        page: 1,
        limit: 10,
      },
    });

    expect(response.status).toBe(200);
    expect(response.data.items).toHaveLength(1);
    expect(response.data.total).toBe(1);
    expect(response.data.items[0].status).toBe('archived');

    // Validate each project
    response.data.items.forEach((project: any) => {
      apiUtils.validateResponse(project, projectSchema);
    });
  });

  test('should manage project members', async ({ api }) => {
    // Create test project and users
    const project = await projectFactory.create({ ownerId: testUser.id });
    const member1 = await userFactory.create();
    const member2 = await userFactory.create();

    // Add members
    const addResponse = await api.post(
      `/projects/${project.id}/members`,
      {
        members: [
          { userId: member1.id, role: 'developer' },
          { userId: member2.id, role: 'viewer' },
        ],
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      },
    );

    expect(addResponse.status).toBe(200);
    expect(addResponse.data.members).toHaveLength(2);

    // Remove member
    const removeResponse = await api.delete(`/projects/${project.id}/members/${member1.id}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(removeResponse.status).toBe(204);

    // Verify members
    const getResponse = await api.get(`/projects/${project.id}/members`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(getResponse.data).toHaveLength(1);
    expect(getResponse.data[0].userId).toBe(member2.id);
  });

  test('should handle project settings', async ({ api }) => {
    // Create test project
    const project = await projectFactory.create({ ownerId: testUser.id });

    // Update settings
    const updateResponse = await api.put(
      `/projects/${project.id}/settings`,
      {
        visibility: 'private',
        allowGuestAccess: false,
        notifyOnChanges: true,
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      },
    );

    expect(updateResponse.status).toBe(200);

    // Get settings
    const getResponse = await api.get(`/projects/${project.id}/settings`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(getResponse.status).toBe(200);
    expect(getResponse.data).toMatchObject({
      visibility: 'private',
      allowGuestAccess: false,
      notifyOnChanges: true,
    });
  });

  test('should validate project data', async ({ api }) => {
    // Test invalid project data
    const invalidData = {
      name: '', // Empty name
      status: 'invalid', // Invalid status
      startDate: '2024-12-31',
      endDate: '2024-01-01', // End date before start date
    };

    const response = await api
      .post('/projects', invalidData, {
        headers: { Authorization: `Bearer ${authToken}` },
      })
      .catch((r) => r.response);

    expect(response.status).toBe(400);
    expect(response.data.errors).toContainEqual(
      expect.objectContaining({ field: 'name', message: expect.any(String) }),
    );
    expect(response.data.errors).toContainEqual(
      expect.objectContaining({ field: 'status', message: expect.any(String) }),
    );
    expect(response.data.errors).toContainEqual(
      expect.objectContaining({ field: 'endDate', message: expect.any(String) }),
    );
  });

  test('should handle project permissions', async ({ api, apiUtils }) => {
    // Create test project and non-owner user
    const project = await projectFactory.create({ ownerId: testUser.id });
    const otherUser = await userFactory.create();
    const otherToken = await apiUtils.getAuthToken(AuthType.Bearer, {
      username: otherUser.username,
      password: otherUser.password,
    });

    // Try to update project as non-owner
    const updateResponse = await api
      .put(
        `/projects/${project.id}`,
        {
          name: 'Updated Project',
        },
        {
          headers: { Authorization: `Bearer ${otherToken}` },
        },
      )
      .catch((r) => r.response);

    expect(updateResponse.status).toBe(403);

    // Add user as member
    await api.post(
      `/projects/${project.id}/members`,
      {
        members: [{ userId: otherUser.id, role: 'developer' }],
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      },
    );

    // Try to view project as member
    const getResponse = await api.get(`/projects/${project.id}`, {
      headers: { Authorization: `Bearer ${otherToken}` },
    });

    expect(getResponse.status).toBe(200);
  });
});
