import { readFile } from 'node:fs/promises';
import { z } from 'zod';
import type { ApiConfig, Contract } from '../shared/types.js';

const configSchema = z.object({
  port: z.number().int().min(1).max(65535).default(4000),
  basePath: z.string().regex(/^\//).default('/api'),
  seed: z.number().int().optional(),
  defaultLimit: z.number().int().positive().default(20)
});

export const defaultConfig: ApiConfig = { port: 4000, basePath: '/api', defaultLimit: 20 };

export async function loadJson<T>(file: string): Promise<T> {
  try { return JSON.parse(await readFile(file, 'utf8')) as T; }
  catch (error) { throw new Error(`Could not read ${file}: ${(error as Error).message}`); }
}

export async function loadConfig(file: string): Promise<ApiConfig> {
  return configSchema.parse(await loadJson<unknown>(file));
}

export function validateContract(value: unknown): Contract {
  if (!value || typeof value !== 'object') throw new Error('api.json must contain an object');
  const contract = value as Contract;
  if (!contract.resources && !contract.endpoints) throw new Error('api.json must define resources or endpoints');
  for (const [name, resource] of Object.entries(contract.resources ?? {})) {
    if (!resource || typeof resource !== 'object' || !resource.schema || typeof resource.schema !== 'object')
      throw new Error(`Resource "${name}" must define a schema`);
    if (resource.generate !== undefined && (!Number.isInteger(resource.generate) || resource.generate < 0))
      throw new Error(`Resource "${name}" generate must be a non-negative integer`);
  }
  for (const [name, endpoint] of Object.entries(contract.endpoints ?? {})) {
    if (!endpoint || !endpoint.method || !endpoint.path || endpoint.response === undefined)
      throw new Error(`Endpoint "${name}" must define method, path, and response`);
  }
  return contract;
}
