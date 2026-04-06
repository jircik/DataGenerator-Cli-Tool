import { Command } from 'commander';
import { loadConfig } from '../core/config.js';
import * as logger from '../utils/logger.js';

export function registerStatus(program: Command): void {
  program
    .command('status')
    .description('Show the currently active database connection')
    .action(() => {
      const config = loadConfig();
      if (!config) {
        logger.warn('No active connection. Run `datagen connect` first.');
        return;
      }
      const label = config.dbType === 'postgres' ? 'PostgreSQL' : 'MongoDB';
      logger.info(`Connected to ${label} at ${config.host}/${config.database}`);
    });
}