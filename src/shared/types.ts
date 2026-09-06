export type Schema = unknown;

export interface ResourceDefinition {
  schema: Record<string, Schema>;
  generate?: number;
}

export interface EndpointDefinition {
  method: string;
  path: string;
  request?: Schema;
  response: Schema;
  status?: number;
}

export interface Contract {
  resources?: Record<string, ResourceDefinition>;
  endpoints?: Record<string, EndpointDefinition>;
}

export interface ApiConfig {
  port: number;
  basePath: string;
  seed?: number;
  defaultLimit: number;
}

export type DataStore = Record<string, Record<string, unknown>[]>;
