import logger from '../logger';
import { FixtureConfig } from './data.types';

/**
 * Fixture Manager for handling test fixtures
 */
export class FixtureManager {
  private static instance: FixtureManager;
  private fixtures: Map<string, FixtureConfig>;
  private loadedFixtures: Set<string>;
  private setupPromises: Map<string, Promise<void>>;

  private constructor() {
    this.fixtures = new Map();
    this.loadedFixtures = new Set();
    this.setupPromises = new Map();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): FixtureManager {
    if (!FixtureManager.instance) {
      FixtureManager.instance = new FixtureManager();
    }
    return FixtureManager.instance;
  }

  /**
   * Register a new fixture
   */
  public register(config: FixtureConfig): void {
    if (this.fixtures.has(config.name)) {
      throw new Error(`Fixture already registered: ${config.name}`);
    }
    this.fixtures.set(config.name, config);
  }

  /**
   * Load a fixture and its dependencies
   */
  public async load(fixtureName: string): Promise<void> {
    const fixture = this.fixtures.get(fixtureName);
    if (!fixture) {
      throw new Error(`Fixture not found: ${fixtureName}`);
    }

    // Check if fixture is already being loaded
    if (this.setupPromises.has(fixtureName)) {
      return this.setupPromises.get(fixtureName);
    }

    // Check if fixture is already loaded
    if (this.loadedFixtures.has(fixtureName)) {
      return;
    }

    try {
      logger.debug(`Loading fixture: ${fixtureName}`);

      // Load dependencies first
      if (fixture.dependencies) {
        await Promise.all(
          fixture.dependencies.map(dep => this.load(dep))
        );
      }

      // Setup the fixture
      const setupPromise = (async () => {
        if (fixture.setup) {
          await fixture.setup();
        }
        this.loadedFixtures.add(fixtureName);
        this.setupPromises.delete(fixtureName);
      })();

      this.setupPromises.set(fixtureName, setupPromise);
      await setupPromise;

      logger.debug(`Fixture loaded successfully: ${fixtureName}`);
    } catch (error) {
      logger.logError(`Failed to load fixture: ${fixtureName}`, error);
      throw error;
    }
  }

  /**
   * Unload a fixture and its dependents
   */
  public async unload(fixtureName: string): Promise<void> {
    const fixture = this.fixtures.get(fixtureName);
    if (!fixture) {
      throw new Error(`Fixture not found: ${fixtureName}`);
    }

    if (!this.loadedFixtures.has(fixtureName)) {
      return;
    }

    try {
      logger.debug(`Unloading fixture: ${fixtureName}`);

      // Unload dependents first
      for (const [name, fix] of this.fixtures.entries()) {
        if (fix.dependencies?.includes(fixtureName)) {
          await this.unload(name);
        }
      }

      // Teardown the fixture
      if (fixture.teardown) {
        await fixture.teardown();
      }

      this.loadedFixtures.delete(fixtureName);
      logger.debug(`Fixture unloaded successfully: ${fixtureName}`);
    } catch (error) {
      logger.logError(`Failed to unload fixture: ${fixtureName}`, error);
      throw error;
    }
  }

  /**
   * Check if a fixture is loaded
   */
  public isLoaded(fixtureName: string): boolean {
    return this.loadedFixtures.has(fixtureName);
  }

  /**
   * Get all loaded fixtures
   */
  public getLoadedFixtures(): string[] {
    return Array.from(this.loadedFixtures);
  }

  /**
   * Unload all fixtures
   */
  public async unloadAll(): Promise<void> {
    const fixtures = Array.from(this.loadedFixtures);
    for (const fixture of fixtures) {
      await this.unload(fixture);
    }
  }

  /**
   * Reset fixture manager state
   */
  public reset(): void {
    this.loadedFixtures.clear();
    this.setupPromises.clear();
  }
}
