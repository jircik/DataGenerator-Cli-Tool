import fs from 'fs';
import os from 'os';
import path from 'path';

export interface Config {
  connectionString: string;
  dbType: 'postgres' | 'mongo';
  host: string;
  database: string;
}

const CONFIG_DIR = path.join(os.homedir(), '.datagen');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');

export function loadConfig(): Config | null {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    return JSON.parse(raw) as Config;
  } catch {
    return null;
  }
}

export function saveConfig(config: Config): void {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}

export function clearConfig(): void {
  try {
    fs.unlinkSync(CONFIG_PATH);
  } catch {
  }
}

export function parseConnectionString(
  uri: string,
  typeFlag?: string
): { dbType: 'postgres' | 'mongo'; host: string; database: string } {
  let dbType: 'postgres' | 'mongo';

  if (typeFlag === 'postgres' || typeFlag === 'mongo') {
    dbType = typeFlag;
  } else if (uri.startsWith('postgresql://') || uri.startsWith('postgres://')) {
    dbType = 'postgres';
  } else if (uri.startsWith('mongodb://') || uri.startsWith('mongodb+srv://')) {
    dbType = 'mongo';
  } else {
    throw new Error(
      `Cannot detect database type from URI. Use --type postgres or --type mongo.`
    );
  }

  const parsed = new URL(uri);
  const host = parsed.hostname + (parsed.port ? `:${parsed.port}` : '');
  const database = parsed.pathname.replace(/^\//, '');

  return { dbType, host, database };
}

export function maskConnectionString(uri: string): string {
  return uri.replace(/:([^:@]+)@/, ':****@');
}
