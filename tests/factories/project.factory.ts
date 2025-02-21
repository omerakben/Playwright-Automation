import { faker } from '@faker-js/faker';
import { FactoryDefinition } from '../../src/core/data/data.types';
import { User } from './user.factory';

export interface Project {
  id?: number;
  name: string;
  description?: string;
  status: 'active' | 'archived' | 'draft';
  ownerId: number;
  owner?: User;
  members?: User[];
  startDate?: Date;
  endDate?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Project factory definition
 */
export const projectFactory: FactoryDefinition<Project> = {
  entity: 'Project',
  cleanupStrategy: 'afterTest',
  attributes: () => ({
    name: faker.company.name(),
    description: faker.lorem.paragraph(),
    status: 'active',
    ownerId: 0, // Will be set in beforeCreate
    startDate: faker.date.past(),
    endDate: faker.date.future(),
  }),
  beforeCreate: async (attributes) => {
    // Ensure owner exists
    if (!attributes.ownerId) {
      const owner = await userFactory.create();
      attributes.ownerId = owner.id!;
    }
    return attributes;
  },
  afterCreate: async (project) => {
    // Add default project settings or perform other operations
    return project;
  },
};

/**
 * Project factory helpers
 */
export const projectHelpers = {
  /**
   * Create project with members
   */
  createWithMembers: async (
    factory: any,
    memberCount: number,
    overrides: Partial<Project> = {},
  ) => {
    const project = await factory.create({
      attributes: overrides,
    });

    // Create and add members
    const members = await userHelpers.createMany(userFactory, memberCount);
    await addMembersToProject(
      project.id!,
      members.map((m) => m.id!),
    );

    return {
      ...project,
      members,
    };
  },

  /**
   * Create archived project
   */
  createArchived: async (factory: any, overrides: Partial<Project> = {}) => {
    return factory.create({
      attributes: {
        status: 'archived',
        endDate: faker.date.past(),
        ...overrides,
      },
    });
  },

  /**
   * Create draft project
   */
  createDraft: async (factory: any, overrides: Partial<Project> = {}) => {
    return factory.create({
      attributes: {
        status: 'draft',
        startDate: null,
        endDate: null,
        ...overrides,
      },
    });
  },

  /**
   * Create project with specific settings
   */
  createWithSettings: async (
    factory: any,
    settings: Record<string, any>,
    overrides: Partial<Project> = {},
  ) => {
    const project = await factory.create({
      attributes: overrides,
    });

    // Add project settings (implementation depends on your system)
    await addProjectSettings(project.id!, settings);

    return project;
  },
};
