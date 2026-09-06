import http from 'node:http';
import { randomUUID } from 'node:crypto';
import type { Contract, ApiConfig, DataStore } from '../shared/types.js';
import { routes, matchPath } from '../contract/contract.js';
import { generateRecord, resolveSchema, validateBody, setGenerationSeed } from '../schema/schema.js';
import { JsonStore } from '../storage/json-store.js';

const send = (res: http.ServerResponse, status: number, body?: unknown) => { res.statusCode = status; if (body !== undefined) { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(body)); } else res.end(); };
const error = (res: http.ServerResponse, status: number, message: string, issues?: unknown) => send(res, status, { error: status === 400 ? 'ValidationError' : 'Error', message, ...(issues ? { issues } : {}) });
const MAX_BODY_BYTES = 1_048_576;
const localOrigin = (origin: string | undefined) => origin && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
async function body(req: http.IncomingMessage): Promise<unknown> { const declared = Number(req.headers['content-length'] ?? 0); if (declared > MAX_BODY_BYTES) throw new Error('Request body exceeds the 1 MiB limit'); let text = ''; for await (const chunk of req) { text += chunk; if (Buffer.byteLength(text) > MAX_BODY_BYTES) throw new Error('Request body exceeds the 1 MiB limit'); } try { return text ? JSON.parse(text) : undefined; } catch { throw new Error('Request body must be valid JSON'); } }

export function createApiServer(contract: Contract, config: ApiConfig, store: JsonStore) {
  setGenerationSeed(config.seed);
  const table = routes(contract, config.basePath);
  return http.createServer(async (req, res) => {
    const origin = req.headers.origin; if (localOrigin(origin)) { res.setHeader('Access-Control-Allow-Origin', origin!); res.setHeader('Vary', 'Origin'); res.setHeader('Access-Control-Allow-Headers', 'Content-Type'); res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS'); }
    if (req.method === 'OPTIONS') return send(res, 204);
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`), method = req.method ?? 'GET';
    const route = table.find(candidate => candidate.method === method && matchPath(candidate.path, url.pathname));
    if (!route) { if (table.some(candidate => matchPath(candidate.path, url.pathname))) return error(res, 405, 'Method not allowed'); return error(res, 404, 'Route not found'); }
    try {
      const data = await store.load();
      if (route.resource) {
        const resource = route.resource, records = data[resource] ?? [], match = matchPath(route.path, url.pathname)!;
        if (!route.item && method === 'GET') {
          let result = records.filter(record => [...url.searchParams].every(([key, value]) => ['page', 'limit', 'sort', 'order'].includes(key) || String(record[key]) === value));
          const sort = url.searchParams.get('sort'); if (sort) { if (!result.every(item => { const value = item[sort]; return typeof value === 'number' || typeof value === 'string'; })) return error(res, 400, `Cannot sort by ${sort}`); const order = url.searchParams.get('order') === 'desc' ? -1 : 1; result = [...result].sort((a, b) => { const left = a[sort], right = b[sort]; return (left === right ? 0 : left! > right! ? 1 : -1) * order; }); }
          const page = Number(url.searchParams.get('page') ?? 1), limit = Number(url.searchParams.get('limit') ?? config.defaultLimit); if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1) return error(res, 400, 'page and limit must be positive integers');
          return send(res, 200, { data: result.slice((page - 1) * limit, page * limit), meta: { page, limit, total: result.length } });
        }
        const id = match.params.id, index = records.findIndex(record => record.id === id);
        if (route.item && method === 'GET') return index < 0 ? error(res, 404, 'Record not found') : send(res, 200, records[index]);
        if (route.item && method === 'DELETE') { if (index < 0) return error(res, 404, 'Record not found'); records.splice(index, 1); data[resource] = records; await store.save(data); return send(res, 204); }
        let input: unknown; try { input = await body(req); } catch (e) { return error(res, 400, (e as Error).message); }
        const schema = contract.resources![resource].schema, parsed = validateBody(schema, input, method === 'PATCH', method === 'POST' ? ['id'] : []); if (!parsed.success) return error(res, 400, 'Request body is invalid', parsed.error.issues);
        if (method === 'POST') { const record = { ...(parsed.data as object), id: (parsed.data as any).id ?? randomUUID() }; records.push(record); data[resource] = records; await store.save(data); return send(res, 201, record); }
        if (index < 0) return error(res, 404, 'Record not found'); records[index] = { ...records[index], ...(parsed.data as object), id: records[index].id }; data[resource] = records; await store.save(data); return send(res, 200, records[index]);
      }
      const endpoint = route.endpoint!; let input: unknown; try { input = await body(req); } catch (e) { return error(res, 400, (e as Error).message); }
      if (endpoint.request !== undefined) { const parsed = validateBody(endpoint.request, input); if (!parsed.success) return error(res, 400, 'Request body is invalid', parsed.error.issues); }
      return send(res, endpoint.status ?? 200, resolveSchema(endpoint.response));
    } catch (e) { return error(res, 500, (e as Error).message); }
  });
}

export async function seedData(contract: Contract, store: JsonStore, replace: string[] = Object.keys(contract.resources ?? {})) {
  setGenerationSeed((contract as Contract & { seed?: number }).seed);
  const data: DataStore = await store.load();
  for (const name of replace) { const resource = contract.resources?.[name]; if (resource) data[name] = Array.from({ length: resource.generate ?? 0 }, () => generateRecord(resource.schema)); }
  await store.save(data); return data;
}
