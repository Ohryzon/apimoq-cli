import type { Contract, EndpointDefinition } from '../shared/types.js';

export interface Route { method: string; path: string; endpoint?: EndpointDefinition; resource?: string; item?: boolean; }

export function routes(contract: Contract, basePath: string): Route[] {
  const result: Route[] = [];
  for (const [name] of Object.entries(contract.resources ?? {})) {
    const path = `${basePath}/${name}`;
    result.push({ method: 'GET', path, resource: name }, { method: 'POST', path, resource: name });
    result.push({ method: 'GET', path: `${path}/:id`, resource: name, item: true }, { method: 'PATCH', path: `${path}/:id`, resource: name, item: true }, { method: 'DELETE', path: `${path}/:id`, resource: name, item: true });
  }
  for (const endpoint of Object.values(contract.endpoints ?? {})) result.push({ method: endpoint.method.toUpperCase(), path: endpoint.path, endpoint });
  return result;
}

export function matchPath(pattern: string, actual: string): { params: Record<string, string> } | undefined {
  const a = pattern.split('/').filter(Boolean), b = actual.split('/').filter(Boolean);
  if (a.length !== b.length) return undefined;
  const params: Record<string, string> = {};
  for (let i = 0; i < a.length; i++) { if (a[i].startsWith(':')) params[a[i].slice(1)] = decodeURIComponent(b[i]); else if (a[i] !== b[i]) return undefined; }
  return { params };
}
