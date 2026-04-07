import { faker } from '@faker-js/faker';
import type { ParsedSchema, FieldDef, FakerFieldDef, ObjectFieldDef, ArrayFieldDef } from './schema-parser.js';

export function generateValue(fieldDef: FieldDef): unknown {
  // Simple string shorthand: "person.fullName"
  if (typeof fieldDef === 'string') {
    return callFaker(fieldDef, {});
  }

  // Relation fields are resolved before generation — skip here
  if (fieldDef.type === 'relation') {
    return null;
  }

  // Nested object (MongoDB)
  if (fieldDef.type === 'object') {
    return generateRecord({ target: 'mongo', table: '', fields: (fieldDef as ObjectFieldDef).fields });
  }

  // Array (MongoDB)
  if (fieldDef.type === 'array') {
    const def = fieldDef as ArrayFieldDef;
    return Array.from({ length: def.length }, () => {
      if (typeof def.items === 'string') return callFaker(def.items, {});
      return generateRecord({ target: 'mongo', table: '', fields: (def.items as ObjectFieldDef).fields });
    });
  }

  // Standard faker field with options
  const def = fieldDef as FakerFieldDef;
  return callFaker(def.type, {
    min: def.min,
    max: def.max,
    precision: def.precision,
    values: def.values,
  });
}

function callFaker(type: string, opts: Record<string, unknown>): unknown {
  const [namespace, method] = type.split('.');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fn = (faker as any)[namespace]?.[method];

  if (typeof fn !== 'function') {
    throw new Error(
      `Unknown faker type: "${type}". Check https://fakerjs.dev/api/ for valid namespaces and methods.`
    );
  }

  // helpers.arrayElement expects the array as the first argument, not an options object
  if (namespace === 'helpers' && method === 'arrayElement') {
    return fn.call((faker as any)[namespace], opts.values ?? []);
  }

  // Drop undefined keys so faker uses its own defaults
  const cleanOpts = Object.fromEntries(
    Object.entries(opts).filter(([, v]) => v !== undefined)
  );

  if (Object.keys(cleanOpts).length === 0) {
    return fn.call((faker as any)[namespace]);
  }

  return fn.call((faker as any)[namespace], cleanOpts);
}

export function generateRecord(schema: ParsedSchema): Record<string, unknown> {
  const record: Record<string, unknown> = {};
  for (const [name, fieldDef] of Object.entries(schema.fields)) {
    record[name] = generateValue(fieldDef);
  }
  return record;
}

export function generateRecords(schema: ParsedSchema, count: number): Record<string, unknown>[] {
  return Array.from({ length: count }, () => generateRecord(schema));
}