import pg from 'pg';
import { Driver } from './base.driver.js';

const { Client } = pg;

export class PostgresDriver extends Driver {
  private client: InstanceType<typeof Client>;

  constructor(connectionString: string) {
    super();
    this.client = new Client({ connectionString });
  }

  async connect(): Promise<void> {
    await this.client.connect();
  }

  async disconnect(): Promise<void> {
    await this.client.end();
  }

  async insert(table: string, records: Record<string, unknown>[]): Promise<void> {
    if (records.length === 0) return;

    const columns = Object.keys(records[0]);
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
    const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;

    for (const record of records) {
      await this.client.query(sql, columns.map((col) => record[col]));
    }
  }

  async listTables(): Promise<string[]> {
    const result = await this.client.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`
    );
    return result.rows.map((row: { table_name: string }) => row.table_name);
  }

  async fetchIds(table: string, field: string): Promise<unknown[]> {
    const result = await this.client.query(`SELECT ${field} FROM ${table}`);
    return result.rows.map((row: Record<string, unknown>) => row[field]);
  }
}