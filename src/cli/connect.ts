import { Command } from 'commander';
import { parseConnectionString, saveConfig, maskConnectionString } from '../core/config.js';
import * as logger from '../utils/logger.js';

export function registerConnect(program: Command): void {
  program
    .command('connect <connection_string>')
    .description('Save a database connection string')
    .option('--type <type>', 'database type (postgres or mongo)')
    .action((uri: string, options: { type?: string }) => {
      try {
        const { dbType, host, database } = parseConnectionString(uri, options.type);
        saveConfig({ connectionString: uri, dbType, host, database });
        logger.success(`Connected to ${dbType === 'postgres' ? 'PostgreSQL' : 'MongoDB'} at ${host}/${database}`);
      } catch (e) {
        logger.error((e as Error).message);
        logger.info(`Masked URI: ${maskConnectionString(uri)}`);
        process.exit(1);
      }
    });
}