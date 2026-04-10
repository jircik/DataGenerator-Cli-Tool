import { Command } from 'commander';
import { loadConfig } from '../core/config.js';
import { PostgresDriver } from '../drivers/postgres.driver.js';
import { MongoDriver } from '../drivers/mongo.driver.js';
import * as logger from '../utils/logger.js';

export function registerList(program: Command): void {
  const list = program
    .command('list')
    .description('List database objects');

  list
    .command('tables')
    .description('List all tables/collections in the connected database')
    .action(async () => {
      const config = loadConfig();
      if (!config) {
        logger.error('No active connection. Run `datagen connect` first.');
        process.exit(1);
      }

      const driver = config.dbType === 'postgres'
        ? new PostgresDriver(config.connectionString)
        : new MongoDriver(config.connectionString);

      try {
        await driver.connect();
        const tables = await driver.listTables();
        await driver.disconnect();

        if (tables.length === 0) {
          logger.warn('No tables found.');
          return;
        }

        for (const t of tables) {
          logger.info(t);
        }
      } catch (e) {
        logger.error((e as Error).message);
        process.exit(1);
      }
    });
}