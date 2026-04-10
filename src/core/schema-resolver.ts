import fs from 'fs';
import path from 'path';
import { parseSchemaFile } from './schema-parser.js';
import type { ParsedSchema, RelationFieldDef } from './schema-parser.js';

export function discoverSchemas(dirPath: string): ParsedSchema[] {
  const files = fs.readdirSync(dirPath).filter(
    (f) => f.endsWith('.schema.yaml') || f.endsWith('.schema.yml') || f.endsWith('.schema.json')
  );
  return files.map((f) => parseSchemaFile(path.join(dirPath, f)));
}

export function resolveOrder(schemas: ParsedSchema[]): ParsedSchema[] {
  const byTable = new Map<string, ParsedSchema>();
  for (const s of schemas) byTable.set(s.table, s);

  // dependents[A] = tables that depend on A (A must come before them)
  const dependents = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  for (const s of schemas) {
    if (!inDegree.has(s.table)) inDegree.set(s.table, 0);
    if (!dependents.has(s.table)) dependents.set(s.table, []);
  }

  for (const s of schemas) {
    for (const def of Object.values(s.fields)) {
      if (typeof def === 'object' && (def as RelationFieldDef).type === 'relation') {
        const dep = (def as RelationFieldDef).table;
        if (byTable.has(dep)) {
          dependents.get(dep)!.push(s.table);
          inDegree.set(s.table, (inDegree.get(s.table) ?? 0) + 1);
        }
      }
    }
  }

  // Kahn's algorithm
  const queue = [...inDegree.entries()]
    .filter(([, d]) => d === 0)
    .map(([t]) => t);
  const order: ParsedSchema[] = [];

  while (queue.length > 0) {
    const table = queue.shift()!;
    order.push(byTable.get(table)!);
    for (const dependent of dependents.get(table) ?? []) {
      const newDeg = (inDegree.get(dependent) ?? 0) - 1;
      inDegree.set(dependent, newDeg);
      if (newDeg === 0) queue.push(dependent);
    }
  }

  if (order.length !== schemas.length) {
    const cycle = schemas.filter((s) => !order.includes(s)).map((s) => s.table);
    throw new Error(`Circular dependency detected among tables: ${cycle.join(', ')}`);
  }

  return order;
}