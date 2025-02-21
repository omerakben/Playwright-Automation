import Joi from 'joi';
import { AuthType } from '../../src/core/api/auth.handler';
import { expect, test } from '../fixtures/api.fixture';

test.describe('Authentication API', () => {
  const loginSchema = Joi.object({
    token: Joi.string().required(),
    user: Joi.object({
      id: Joi.number().required(),
      username: Joi.string().required(),
      email: Joi.string().email().required(),
      role: Joi.string().valid('user', 'admin').required(),
    }).required(),
  });

  test('should login with valid credentials', async ({ api, apiUtils }) => {
    const response = await api.post('/auth/login', {
      username: 'testuser',
      password: 'testpass123',
    });

    expect(response.status).toBe(200);
    apiUtils.validateResponse(response.data, loginSchema);

    const token = await apiUtils.getAuthToken(AuthType.Bearer, {
      username: 'testuser',
      password: 'testpass123',
    });
    expect(token).toBeDefined();
  });

  test('should fail with invalid credentials', async ({ api }) => {
    const response = await api
      .post('/auth/login', {
        username: 'invalid',
        password: 'wrong',
      })
      .catch((r) => r.response);

    expect(response.status).toBe(401);
    expect(response.data.error).toBe('Invalid credentials');
  });

  test('should refresh access token', async ({ api, apiUtils }) => {
    // Login first to get refresh token
    const loginResponse = await api.post('/auth/login', {
      username: 'testuser',
      password: 'testpass123',
    });

    const refreshToken = loginResponse.data.refreshToken;

    // Refresh token
    const response = await api.post('/auth/refresh', {
      refreshToken,
    });

    expect(response.status).toBe(200);
    apiUtils.validateResponse(response.data, loginSchema);
  });

  test('should logout successfully', async ({ api, apiUtils }) => {
    // Login first
    const token = await apiUtils.getAuthToken(AuthType.Bearer, {
      username: 'testuser',
      password: 'testpass123',
    });

    // Logout
    const response = await api.post('/auth/logout', null, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(response.status).toBe(200);
    expect(response.data.message).toBe('Logged out successfully');
  });

  test('should handle password reset flow', async ({ api }) => {
    // Request password reset
    const requestResponse = await api.post('/auth/reset-password/request', {
      email: 'testuser@example.com',
    });
    expect(requestResponse.status).toBe(200);

    // Mock token verification (in real tests, get token from email service)
    const resetToken = 'mock-reset-token';

    // Reset password
    const resetResponse = await api.post('/auth/reset-password/confirm', {
      token: resetToken,
      newPassword: 'newpass123',
    });
    expect(resetResponse.status).toBe(200);

    // Verify new password works
    const loginResponse = await api.post('/auth/login', {
      username: 'testuser',
      password: 'newpass123',
    });
    expect(loginResponse.status).toBe(200);
  });
});
