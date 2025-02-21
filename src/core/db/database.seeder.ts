import { PrismaClient } from '@prisma/client';
import logger from '../logger';

export class DatabaseSeeder {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async seed() {
    try {
      logger.info('Starting database seed');

      // Add your seeding logic here
      // For example:
      // await this.seedUsers();
      // await this.seedProjects();

      logger.info('Database seed completed');
    } catch (error) {
      logger.logError('Failed to seed database', error);
      throw error;
    } finally {
      await this.prisma.$disconnect();
    }
  }

  async cleanup() {
    try {
      logger.info('Starting database cleanup');

      // Clean up all tables
      await this.prisma.project.deleteMany();
      await this.prisma.user.deleteMany();

      logger.info('Database cleanup completed');
    } catch (error) {
      logger.logError('Failed to clean up database', error);
      throw error;
    } finally {
      await this.prisma.$disconnect();
    }
  }
}
