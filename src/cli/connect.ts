import { Command } from 'commander';
import ora from 'ora';
import { parseConnectionString, saveConfig, maskConnectionString } from '../core/config.js';
import { PostgresDriver } from '../drivers/postgres.driver.js';
import { MongoDriver } from '../drivers/mongo.driver.js';
import * as logger from '../utils/logger.js';

export function registerConnect(program: Command): void {
  program
    .command('connect <connection_string>')
    .description('Save a database connection string')
    .option('--type <type>', 'database type (postgres or mongo)')
    .action(async (uri: string, options: { type?: string }) => {
      let parsed;
      try {
        parsed = parseConnectionString(uri, options.type);
      } catch (e) {
        logger.error((e as Error).message);
        process.exit(1);
      }

      const { dbType, host, database } = parsed;
      const driver = dbType === 'postgres'
        ? new PostgresDriver(uri)
        : new MongoDriver(uri);

      const spinner = ora('Testing connection...').start();
      try {
        await driver.connect();
        await driver.disconnect();
        spinner.succeed('Connection successful.');
      } catch (e) {
        spinner.fail('Connection failed.');
        logger.error((e as Error).message);
        logger.info(`URI: ${maskConnectionString(uri)}`);
        process.exit(1);
      }

      saveConfig({ connectionString: uri, dbType, host, database });
      logger.success(`Connected to ${dbType === 'postgres' ? 'PostgreSQL' : 'MongoDB'} at ${host}/${database}`);
    });
}
