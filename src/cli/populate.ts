import { Command } from 'commander';
import ora from 'ora';
import { loadConfig } from '../core/config.js';
import { parseSchemaFile, parseInlineFields } from '../core/schema-parser.js';
import { generateRecords } from '../core/generator.js';
import { discoverSchemas, resolveOrder } from '../core/schema-resolver.js';
import { PostgresDriver } from '../drivers/postgres.driver.js';
import { MongoDriver } from '../drivers/mongo.driver.js';
import type { Driver } from '../drivers/base.driver.js';
import type { ParsedSchema, RelationFieldDef } from '../core/schema-parser.js';
import * as logger from '../utils/logger.js';

export function registerPopulate(program: Command): void {
  program
    .command('populate [source]')
    .description('Populate a database table with fake data')
    .option('--count <n>', 'number of records to generate', '10')
    .option('--table <name>', 'target table/collection (required for inline mode)')
    .option('--field <spec>', 'inline field definition (repeatable)', collect, [])
    .option('--dry-run', 'print generated records without inserting')
    .action(async (source: string | undefined, options: {
      count: string;
      table?: string;
      field: string[];
      dryRun?: boolean;
    }) => {
      const count = parseInt(options.count, 10);

      // ── Detect mode ────────────────────────────────────────────────────────
      const isFileMode = source != null && (source.endsWith('.yaml') || source.endsWith('.json'));
      const isFolderMode = source != null && !isFileMode;
      const isInlineMode = source == null && options.table != null && options.field.length > 0;
      const isOverrideMode = isFileMode && options.field.length > 0;

      if (isFolderMode) {
        const config = loadConfig();
        if (!config) {
          logger.error('No active connection. Run `datagen connect` first.');
          process.exit(1);
        }

        let schemas: ParsedSchema[];
        try {
          const all = discoverSchemas(source!).filter((s) => s.target === config.dbType);
          schemas = resolveOrder(all);
        } catch (e) {
          logger.error((e as Error).message);
          process.exit(1);
        }

        if (schemas.length === 0) {
          logger.warn(`No schema files found in "${source}".`);
          return;
        }

        const driver: Driver = config.dbType === 'postgres'
          ? new PostgresDriver(config.connectionString)
          : new MongoDriver(config.connectionString);

        try {
          await driver.connect();
        } catch (e) {
          logger.error(`Connection failed: ${(e as Error).message}`);
          process.exit(1);
        }

        for (let i = 0; i < schemas.length; i++) {
          const schema = schemas[i];
          const spinner = ora(`Populating "${schema.table}" (${i + 1}/${schemas.length})...`).start();

          try {
            const relationFields = Object.entries(schema.fields).filter(
              ([, def]) => typeof def === 'object' && (def as RelationFieldDef).type === 'relation'
            ) as [string, RelationFieldDef][];

            const relationIds: Record<string, unknown[]> = {};
            for (const [fieldName, def] of relationFields) {
              const ids = await driver.fetchIds(def.table, def.field);
              if (ids.length === 0) {
                spinner.fail(`"${def.table}" is empty. Cannot populate "${schema.table}".`);
                await driver.disconnect();
                process.exit(1);
              }
              relationIds[fieldName] = ids;
            }

            const records = generateRecords(schema, count, relationIds);
            await driver.insert(schema.table, records);
            spinner.succeed(`Populated "${schema.table}" with ${count} records (${i + 1}/${schemas.length}).`);
          } catch (e) {
            spinner.fail(`Failed to populate "${schema.table}".`);
            logger.error((e as Error).message);
            await driver.disconnect();
            process.exit(1);
          }
        }

        await driver.disconnect();
        return;
      }

      if (!isFileMode && !isInlineMode) {
        logger.error('Provide a schema file, or use --table and --field for inline mode.');
        process.exit(1);
      }

      // ── Load config ─────────────────────────────────────────────────────────
      const config = loadConfig();
      if (!config) {
        logger.error('No active connection. Run `datagen connect` first.');
        process.exit(1);
      }

      // ── Parse schema ────────────────────────────────────────────────────────
      let schema;
      try {
        if (isFileMode) {
          schema = parseSchemaFile(source!);
          if (isOverrideMode) {
            const overrides = parseInlineFields(options.field, schema.table, schema.target);
            schema = { ...schema, fields: { ...schema.fields, ...overrides.fields } };
          }
        } else {
          // Inline mode
          schema = parseInlineFields(options.field, options.table!, config.dbType);
        }
      } catch (e) {
        logger.error(`Schema error: ${(e as Error).message}`);
        process.exit(1);
      }

      // ── Resolve relation fields ─────────────────────────────────────────────
      const relationFields = Object.entries(schema.fields).filter(
        ([, def]) => typeof def === 'object' && (def as RelationFieldDef).type === 'relation'
      ) as [string, RelationFieldDef][];

      const relationIds: Record<string, unknown[]> = {};
      let driver: Driver | null = null;

      if (relationFields.length > 0) {
        driver = config.dbType === 'postgres'
          ? new PostgresDriver(config.connectionString)
          : new MongoDriver(config.connectionString);

        try {
          await driver.connect();
        } catch (e) {
          logger.error(`Connection failed: ${(e as Error).message}`);
          process.exit(1);
        }

        for (const [fieldName, def] of relationFields) {
          const ids = await driver.fetchIds(def.table, def.field);
          if (ids.length === 0) {
            await driver.disconnect();
            logger.error(
              `Table "${def.table}" is empty. Populate it before inserting into "${schema.table}".`
            );
            process.exit(1);
          }
          relationIds[fieldName] = ids;
        }
      }

      // ── Generate records ────────────────────────────────────────────────────
      const records = generateRecords(schema, count, relationIds);

      if (options.dryRun) {
        if (driver) await driver.disconnect();
        logger.info(`Generated ${count} records for "${schema.table}" (dry run — nothing inserted)`);
        console.log(JSON.stringify(records, null, 2));
        return;
      }

      // ── Insert ──────────────────────────────────────────────────────────────
      if (!driver) {
        driver = config.dbType === 'postgres'
          ? new PostgresDriver(config.connectionString)
          : new MongoDriver(config.connectionString);
      }

      const spinner = ora(`Inserting ${count} records into "${schema.table}"...`).start();
      try {
        if (relationFields.length === 0) await driver.connect();
        await driver.insert(schema.table, records);
        await driver.disconnect();
        spinner.succeed(`Inserted ${count} records into "${schema.table}".`);
      } catch (e) {
        spinner.fail('Insert failed.');
        logger.error((e as Error).message);
        process.exit(1);
      }
    });
}

function collect(val: string, prev: string[]): string[] {
  return [...prev, val];
}