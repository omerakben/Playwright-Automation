import { faker } from '@faker-js/faker';
import logger from '../logger';
import {
    BaseEntity,
    CleanupStrategy,
    FactoryDefinition,
    FactoryFunction,
    FactoryOptions,
    TestDataState,
} from './data.types';

/**
 * Factory Manager for handling test data creation and cleanup
 */
export class FactoryManager {
  private static instance: FactoryManager;
  private factories: Map<string, FactoryDefinition<any>>;
  private state: TestDataState;

  private constructor() {
    this.factories = new Map();
    this.state = {
      entities: new Map(),
      cleanupStrategies: new Map(),
    };
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): FactoryManager {
    if (!FactoryManager.instance) {
      FactoryManager.instance = new FactoryManager();
    }
    return FactoryManager.instance;
  }

  /**
   * Define a new factory
   */
  public define<T extends BaseEntity>(definition: FactoryDefinition<T>): FactoryFunction<T> {
    this.factories.set(definition.entity, definition);
    this.state.cleanupStrategies.set(definition.entity, definition.cleanupStrategy || 'afterTest');

    return async (options?: FactoryOptions): Promise<T> => {
      return this.create(definition.entity, options);
    };
  }

  /**
   * Create an entity instance
   */
  public async create<T extends BaseEntity>(
    entityName: string,
    options: FactoryOptions = {}
  ): Promise<T> {
    const factory = this.factories.get(entityName);
    if (!factory) {
      throw new Error(`Factory not found for entity: ${entityName}`);
    }

    try {
      // Generate base attributes
      let attributes = factory.attributes();

      // Override with provided attributes
      if (options.attributes) {
        attributes = { ...attributes, ...options.attributes };
      }

      // Run beforeCreate hook
      if (factory.beforeCreate) {
        attributes = await factory.beforeCreate(attributes);
      }

      // Create entity (implement actual creation logic here)
      const entity = attributes as T;

      // Run afterCreate hook
      if (factory.afterCreate) {
        await factory.afterCreate(entity);
      }

      // Track entity for cleanup if not transient
      if (!options.transient) {
        this.trackEntity(entityName, entity);
      }

      logger.debug(`Created test data entity: ${entityName}`, { entity });
      return entity;
    } catch (error) {
      logger.logError(`Failed to create test data entity: ${entityName}`, error);
      throw error;
    }
  }

  /**
   * Create multiple entities
   */
  public async createMany<T extends BaseEntity>(
    entityName: string,
    count: number,
    options: FactoryOptions = {}
  ): Promise<T[]> {
    const entities: T[] = [];
    for (let i = 0; i < count; i++) {
      const entity = await this.create<T>(entityName, options);
      entities.push(entity);
    }
    return entities;
  }

  /**
   * Track entity for cleanup
   */
  private trackEntity(entityName: string, entity: BaseEntity): void {
    if (!this.state.entities.has(entityName)) {
      this.state.entities.set(entityName, []);
    }
    this.state.entities.get(entityName)!.push(entity);
  }

  /**
   * Clean up entities based on strategy
   */
  public async cleanup(strategy: CleanupStrategy = 'afterTest'): Promise<void> {
    for (const [entityName, entities] of this.state.entities.entries()) {
      const entityStrategy = this.state.cleanupStrategies.get(entityName);
      if (entityStrategy === strategy) {
        await this.cleanupEntities(entityName, entities);
        this.state.entities.delete(entityName);
      }
    }
  }

  /**
   * Clean up specific entities
   */
  private async cleanupEntities(entityName: string, entities: BaseEntity[]): Promise<void> {
    try {
      // Implement actual cleanup logic here
      logger.debug(`Cleaning up test data entities: ${entityName}`, { count: entities.length });
    } catch (error) {
      logger.logError(`Failed to cleanup test data entities: ${entityName}`, error);
      throw error;
    }
  }

  /**
   * Get faker instance for data generation
   */
  public getFaker(): typeof faker {
    return faker;
  }

  /**
   * Reset factory manager state
   */
  public reset(): void {
    this.state.entities.clear();
    this.state.cleanupStrategies.clear();
  }
}
