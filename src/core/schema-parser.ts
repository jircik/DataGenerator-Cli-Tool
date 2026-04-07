import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { z } from 'zod';

// ─── TypeScript types ──────────────────────────────────────────────────────

export type RelationFieldDef = {
  type: 'relation';
  table: string;
  field: string;
  strategy: 'random' | 'sequential';
};

export type ObjectFieldDef = {
  type: 'object';
  fields: Record<string, FieldDef>;
};

export type ArrayFieldDef = {
  type: 'array';
  items: string | ObjectFieldDef;
  length: number;
};

export type FakerFieldDef = {
  type: string;
  primary?: boolean;
  min?: number;
  max?: number;
  precision?: number;
  values?: unknown[];
};

export type FieldDef = string | RelationFieldDef | ObjectFieldDef | ArrayFieldDef | FakerFieldDef;

export type ParsedSchema = {
  target: 'postgres' | 'mongo';
  table: string;
  fields: Record<string, FieldDef>;
};

// ─── Zod schemas ──────────────────────────────────────────────────────────

const RelationFieldSchema = z.object({
  type: z.literal('relation'),
  table: z.string(),
  field: z.string(),
  strategy: z.enum(['random', 'sequential']),
});

const FakerFieldSchema = z.object({
  type: z.string(),
  primary: z.boolean().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  precision: z.number().optional(),
  values: z.array(z.unknown()).optional(),
});

// Recursive schemas need z.lazy() to break the circular reference at runtime
const ObjectFieldSchema: z.ZodType<ObjectFieldDef> = z.lazy(() =>
  z.object({
    type: z.literal('object'),
    fields: z.record(z.string(), FieldDefSchema),
  })
);

const ArrayFieldSchema: z.ZodType<ArrayFieldDef> = z.lazy(() =>
  z.object({
    type: z.literal('array'),
    items: z.union([z.string(), ObjectFieldSchema]),
    length: z.number().int().positive(),
  })
);

// FieldDefSchema is the root of the recursive union — always wrap in z.lazy
const FieldDefSchema: z.ZodType<FieldDef> = z.lazy(() =>
  z.union([
    z.string(),
    RelationFieldSchema,
    ObjectFieldSchema,
    ArrayFieldSchema,
    FakerFieldSchema,
  ])
);

const SchemaFileSchema = z
  .object({
    target: z.enum(['postgres', 'mongo']),
    table: z.string().optional(),
    collection: z.string().optional(),
    fields: z.record(z.string(), FieldDefSchema),
  })
  .refine((d) => d.table != null || d.collection != null, {
    message: 'Schema must have either "table" (postgres) or "collection" (mongo)',
  });

// ─── Public functions ──────────────────────────────────────────────────────

export function parseSchemaFile(filePath: string): ParsedSchema {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const ext = path.extname(filePath).toLowerCase();

  let parsed: unknown;
  if (ext === '.yaml' || ext === '.yml') {
    parsed = yaml.load(raw);
  } else if (ext === '.json') {
    parsed = JSON.parse(raw);
  } else {
    throw new Error(`Unsupported file extension: ${ext}. Use .yaml or .json`);
  }

  const result = SchemaFileSchema.safeParse(parsed);
  if (!result.success) {
    throw result.error;
  }

  const { target, table, collection, fields } = result.data;
  return { target, table: (table ?? collection)!, fields };
}

export function parseInlineFields(
  fieldSpecs: string[],
  tableName: string,
  target: 'postgres' | 'mongo'
): ParsedSchema {
  const fields: Record<string, FieldDef> = {};

  for (const spec of fieldSpecs) {
    const parts = spec.split(':');
    const name = parts[0];
    const type = parts[1];
    const optParts = parts.slice(2);

    if (optParts.length === 0) {
      fields[name] = type;
    } else {
      const fieldDef: FakerFieldDef = { type };
      for (const opt of optParts) {
        const [key, value] = opt.split('=');
        if (key === 'min' || key === 'max' || key === 'precision') {
          fieldDef[key] = Number(value);
        }
      }
      fields[name] = fieldDef;
    }
  }

  return { target, table: tableName, fields };
}