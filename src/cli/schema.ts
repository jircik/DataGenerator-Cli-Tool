import fs from 'fs';
import path from 'path';
import { Command } from 'commander';
import { parseSchemaFile } from '../core/schema-parser.js';
import { formatZodError } from '../utils/validator.js';
import { ZodError } from 'zod';
import * as logger from '../utils/logger.js';

export function registerSchema(program: Command): void {
  const schema = program
    .command('schema')
    .description('Manage schema files');

  schema
    .command('validate <file>')
    .description('Validate a schema file')
    .action((file: string) => {
      try {
        const parsed = parseSchemaFile(file);
        const fieldCount = Object.keys(parsed.fields).length;

        const hasPrimary = Object.values(parsed.fields).some(
          (f) => typeof f === 'object' && 'primary' in f && f.primary === true
        );
        if (parsed.target === 'postgres' && !hasPrimary) {
          logger.warn('No field marked with "primary: true" — consider adding a primary key.');
        }

        logger.success(`Valid schema: "${parsed.table}" (${fieldCount} fields)`);
      } catch (e) {
        if (e instanceof ZodError) {
          formatZodError(e);
        } else {
          logger.error((e as Error).message);
        }
        process.exit(1);
      }
    });

  schema
    .command('list')
    .description('List all schema files in .datagen/')
    .action(() => {
      const dir = path.join(process.cwd(), '.datagen');

      if (!fs.existsSync(dir)) {
        logger.warn('No .datagen/ folder found in the current directory.');
        return;
      }

      const files = fs.readdirSync(dir).filter(
        (f) => f.endsWith('.schema.yaml') || f.endsWith('.schema.yml') || f.endsWith('.schema.json')
      );

      if (files.length === 0) {
        logger.warn('No schema files found in .datagen/');
        return;
      }

      for (const f of files) {
        logger.info(path.join('.datagen', f));
      }
    });
}