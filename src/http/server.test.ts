import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createApiServer } from './server.js';
import { JsonStore } from '../storage/json-store.js';
import type { Contract } from '../shared/types.js';

const servers: ReturnType<typeof createApiServer>[] = [];
afterEach(async () => { for (const server of servers.splice(0)) { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); } });

describe('HTTP API', () => {
  it('supports CRUD, persistence, validation, filtering, and pagination', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'apimoq-')), file = path.join(dir, 'data.json');
    const contract: Contract = { resources: { products: { schema: { id: 'uuid', name: 'string', category: 'string', price: 'number' } } } };
    const server = createApiServer(contract, { port: 0, basePath: '/api', defaultLimit: 20 }, new JsonStore(file)); servers.push(server);
    await new Promise<void>(resolve => server.listen(0, resolve)); const address = server.address(); const base = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`;
    let response = await fetch(`${base}/api/products`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Apple', category: 'fruit', price: 3 }) });
    expect(response.status).toBe(201); const created = await response.json(); expect(created.id).toBeTypeOf('string');
    response = await fetch(`${base}/api/products?category=fruit&page=1&limit=1`); expect(response.status).toBe(200); expect((await response.json()).meta.total).toBe(1);
    response = await fetch(`${base}/api/products`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Bad', category: 'fruit', price: 'wrong', extra: true }) }); expect(response.status).toBe(400);
    response = await fetch(`${base}/api/products/${created.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Pear' }) }); expect((await response.json()).name).toBe('Pear');
    response = await fetch(`${base}/api/products/${created.id}`, { method: 'DELETE' }); expect(response.status).toBe(204); expect(JSON.parse(await readFile(file, 'utf8')).products).toHaveLength(0);
  });
});
