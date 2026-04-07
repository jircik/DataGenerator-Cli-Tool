export abstract class Driver {
  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract insert(target: string, records: Record<string, unknown>[]): Promise<void>;
  abstract listTables(): Promise<string[]>;
  abstract fetchIds(target: string, field: string): Promise<unknown[]>;
}