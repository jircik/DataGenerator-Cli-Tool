import { MongoClient, Db } from 'mongodb';
import { Driver } from './base.driver.js';

export class MongoDriver extends Driver {
  private client: MongoClient;
  private db!: Db;
  private dbName: string;

  constructor(connectionString: string) {
    super();
    this.client = new MongoClient(connectionString);
    this.dbName = new URL(connectionString).pathname.replace(/^\//, '');
  }

  async connect(): Promise<void> {
    await this.client.connect();
    this.db = this.client.db(this.dbName);
  }

  async disconnect(): Promise<void> {
    await this.client.close();
  }

  async insert(collection: string, records: Record<string, unknown>[]): Promise<void> {
    if (records.length === 0) return;
    await this.db.collection(collection).insertMany(records);
  }

  async listTables(): Promise<string[]> {
    const collections = await this.db.listCollections().toArray();
    return collections.map((c) => c.name);
  }

  async fetchIds(collection: string, field: string): Promise<unknown[]> {
    const docs = await this.db
      .collection(collection)
      .find({}, { projection: { [field]: 1 } })
      .toArray();
    return docs.map((doc) => doc[field]);
  }
}