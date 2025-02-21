import Joi from 'joi';
import { AuthType } from '../../src/core/api/auth.handler';
import { expect, test } from '../fixtures/api.fixture';

test.describe('Users API', () => {
  const userSchema = Joi.object({
    id: Joi.number().required(),
    username: Joi.string().required(),
    email: Joi.string().email().required(),
    role: Joi.string().valid('user', 'admin').required(),
    createdAt: Joi.date().iso().required(),
    updatedAt: Joi.date().iso().required(),
  });

  let authToken: string;

  test.beforeEach(async ({ apiUtils }) => {
    // Get admin token for user management
    authToken = await apiUtils.getAuthToken(AuthType.Bearer, {
      username: 'admin',
      password: 'adminpass123',
    });
  });

  test('should create new user', async ({ api, apiUtils }) => {
    const userData = {
      username: `user${Date.now()}`,
      email: `user${Date.now()}@example.com`,
      password: 'pass123',
      role: 'user',
    };

    const response = await api.post('/users', userData, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(response.status).toBe(201);
    apiUtils.validateResponse(response.data, userSchema);
    expect(response.data.username).toBe(userData.username);
  });

  test('should get user by ID', async ({ api, apiUtils }) => {
    // Create user first
    const createResponse = await api.post(
      '/users',
      {
        username: `user${Date.now()}`,
        email: `user${Date.now()}@example.com`,
        password: 'pass123',
        role: 'user',
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      },
    );

    // Get user by ID
    const userId = createResponse.data.id;
    const response = await api.get(`/users/${userId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(response.status).toBe(200);
    apiUtils.validateResponse(response.data, userSchema);
  });

  test('should update user', async ({ api, apiUtils }) => {
    // Create user first
    const createResponse = await api.post(
      '/users',
      {
        username: `user${Date.now()}`,
        email: `user${Date.now()}@example.com`,
        password: 'pass123',
        role: 'user',
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      },
    );

    // Update user
    const userId = createResponse.data.id;
    const updateData = {
      email: `updated${Date.now()}@example.com`,
      role: 'admin',
    };

    const response = await api.put(`/users/${userId}`, updateData, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(response.status).toBe(200);
    apiUtils.validateResponse(response.data, userSchema);
    expect(response.data.email).toBe(updateData.email);
    expect(response.data.role).toBe(updateData.role);
  });

  test('should delete user', async ({ api }) => {
    // Create user first
    const createResponse = await api.post(
      '/users',
      {
        username: `user${Date.now()}`,
        email: `user${Date.now()}@example.com`,
        password: 'pass123',
        role: 'user',
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      },
    );

    // Delete user
    const userId = createResponse.data.id;
    const response = await api.delete(`/users/${userId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(response.status).toBe(204);

    // Verify user is deleted
    const getResponse = await api
      .get(`/users/${userId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      })
      .catch((r) => r.response);

    expect(getResponse.status).toBe(404);
  });

  test('should list users with pagination', async ({ api, apiUtils }) => {
    // Create multiple users
    const usersToCreate = 5;
    for (let i = 0; i < usersToCreate; i++) {
      await api.post(
        '/users',
        {
          username: `user${Date.now()}_${i}`,
          email: `user${Date.now()}_${i}@example.com`,
          password: 'pass123',
          role: 'user',
        },
        {
          headers: { Authorization: `Bearer ${authToken}` },
        },
      );
    }

    // Get paginated results
    const response = await api.get('/users', {
      headers: { Authorization: `Bearer ${authToken}` },
      params: {
        page: 1,
        limit: 3,
      },
    });

    expect(response.status).toBe(200);
    expect(response.data.items).toHaveLength(3);
    expect(response.data.total).toBeGreaterThanOrEqual(usersToCreate);
    expect(response.data.page).toBe(1);
    expect(response.data.pages).toBeGreaterThanOrEqual(2);

    // Validate each user in response
    response.data.items.forEach((user: any) => {
      apiUtils.validateResponse(user, userSchema);
    });
  });
});
