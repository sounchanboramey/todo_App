import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import type { CookieOptions } from 'express';
if (existsSync('.env')) loadEnvFile('.env');
function secret(name: string): string {
  const value = process.env[name];
  if (!value || value.length < 32)
    throw new Error(`${name} must contain at least 32 characters`);
  return value;
}
function seconds(name: string, fallback: number): number {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isSafeInteger(value) || value <= 0)
    throw new Error(`${name} must be a positive number of seconds`);
  return value;
}
export const authConfig = {
  accessSecret: secret('JWT_ACCESS_SECRET'),
  refreshSecret: secret('JWT_REFRESH_SECRET'),
  accessSeconds: seconds('JWT_ACCESS_TTL_SECONDS', 900),
  refreshSeconds: seconds('JWT_REFRESH_TTL_SECONDS', 604800),
};
if (authConfig.accessSecret === authConfig.refreshSecret)
  throw new Error('JWT secrets must be different');
export const refreshCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/api/auth',
};
export const refreshCookieName = 'refresh_token';
