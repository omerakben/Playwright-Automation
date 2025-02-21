export * from './env.config';
export * from './config.validator';

// Re-export the config instance for easy access
import { config } from './env.config';
export default config;
