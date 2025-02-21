/**
 * Base interface for all test data entities
 */
export interface BaseEntity {
  id?: string | number;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Test data factory options
 */
export interface FactoryOptions {
  transient?: boolean;  // If true, data won't be persisted
  cleanup?: boolean;    // If true, data will be cleaned up after test
  count?: number;       // Number of entities to create
  attributes?: Record<string, any>; // Override default attributes
}

/**
 * Data cleanup strategy
 */
export type CleanupStrategy = 'afterTest' | 'afterSuite' | 'afterAll' | 'manual';

/**
 * Test data state for tracking created entities
 */
export interface TestDataState {
  entities: Map<string, BaseEntity[]>;
  cleanupStrategies: Map<string, CleanupStrategy>;
}

/**
 * Factory function type
 */
export type FactoryFunction<T extends BaseEntity> = (options?: FactoryOptions) => Promise<T>;

/**
 * Factory definition interface
 */
export interface FactoryDefinition<T extends BaseEntity> {
  entity: string;
  cleanupStrategy?: CleanupStrategy;
  attributes: () => Partial<T>;
  beforeCreate?: (attributes: Partial<T>) => Promise<Partial<T>>;
  afterCreate?: (entity: T) => Promise<T>;
}

/**
 * Database seeder configuration
 */
export interface SeederConfig {
  truncate?: boolean;  // Whether to truncate tables before seeding
  dependencies?: string[];  // Entity dependencies for seeding order
  environment?: string[];  // Specific environments where seed should run
}

/**
 * Test data provider interface
 */
export interface DataProvider<T extends BaseEntity> {
  create(options?: FactoryOptions): Promise<T>;
  createMany(count: number, options?: FactoryOptions): Promise<T[]>;
  build(attributes?: Record<string, any>): Promise<T>;
  cleanup(): Promise<void>;
}

/**
 * Test fixture configuration
 */
export interface FixtureConfig {
  name: string;
  scope: 'test' | 'suite' | 'global';
  dependencies?: string[];
  setup?: () => Promise<void>;
  teardown?: () => Promise<void>;
}
