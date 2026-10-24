import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';

if (existsSync('.env')) {
  loadEnvFile('.env');
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const port = Number(requiredEnv('DB_PORT'));
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('DB_PORT must be an integer between 1 and 65535');
}

export const databaseConfig = {
  type: 'postgres' as const,
  host: requiredEnv('DB_HOST'),
  port,
  username: requiredEnv('DB_USERNAME'),
  password: requiredEnv('DB_PASSWORD'),
  database: requiredEnv('DB_DATABASE'),
};
