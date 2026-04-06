import { Command } from 'commander';
import { clearConfig } from '../core/config.js';
import * as logger from '../utils/logger.js';

export function registerDisconnect(program: Command): void {
  program
    .command('disconnect')
    .description('Clear the active database connection')
    .action(() => {
      clearConfig();
      logger.success('Disconnected. Connection cleared.');
    });
}