import { faker } from '@faker-js/faker';
import { FactoryDefinition } from '../../src/core/data/data.types';

export interface User {
  id?: number;
  username: string;
  email: string;
  password: string;
  role: 'user' | 'admin';
  firstName?: string;
  lastName?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * User factory definition
 */
export const userFactory: FactoryDefinition<User> = {
  entity: 'User',
  cleanupStrategy: 'afterTest',
  attributes: () => ({
    username: faker.internet.userName(),
    email: faker.internet.email(),
    password: faker.internet.password({ length: 12, prefix: 'Test!' }),
    role: 'user',
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
  }),
  beforeCreate: async (attributes) => {
    // Hash password or perform other operations before creation
    return attributes;
  },
  afterCreate: async (user) => {
    // Perform any post-creation operations
    return user;
  },
};

/**
 * User factory helpers
 */
export const userHelpers = {
  /**
   * Create admin user
   */
  createAdmin: async (factory: any, overrides: Partial<User> = {}) => {
    return factory.create({
      attributes: {
        role: 'admin',
        ...overrides,
      },
    });
  },

  /**
   * Create multiple users
   */
  createMany: async (factory: any, count: number, overrides: Partial<User> = {}) => {
    return factory.createMany(count, {
      attributes: overrides,
    });
  },

  /**
   * Create user with verified email
   */
  createVerified: async (factory: any, overrides: Partial<User> = {}) => {
    return factory.create({
      attributes: {
        emailVerified: true,
        ...overrides,
      },
    });
  },

  /**
   * Create user with specific permissions
   */
  createWithPermissions: async (
    factory: any,
    permissions: string[],
    overrides: Partial<User> = {},
  ) => {
    const user = await factory.create({
      attributes: overrides,
    });

    // Add permissions to user (implementation depends on your system)
    await addPermissionsToUser(user.id, permissions);

    return user;
  },
};
