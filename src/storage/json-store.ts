import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { DataStore } from '../shared/types.js';

export class JsonStore {
  constructor(private readonly file: string) {}
  async load(): Promise<DataStore> {
    try { return JSON.parse(await readFile(this.file, 'utf8')) as DataStore; }
    catch (error: any) { if (error.code === 'ENOENT') return {}; throw new Error(`Could not read data store: ${error.message}`); }
  }
  async save(data: DataStore) {
    await mkdir(path.dirname(this.file), { recursive: true });
    const temporary = `${this.file}.tmp-${process.pid}`;
    await writeFile(temporary, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
    await rename(temporary, this.file);
  }
}
