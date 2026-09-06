import { faker } from '@faker-js/faker';
import { z, type ZodTypeAny } from 'zod';
import type { Schema } from '../shared/types.js';

const aliases: Record<string, () => unknown> = {
  string: () => faker.string.alpha({ length: 12 }), number: () => faker.number.float({ min: 0, max: 1000, fractionDigits: 2 }),
  integer: () => faker.number.int({ min: 0, max: 1000 }), boolean: () => faker.datatype.boolean(),
  email: () => faker.internet.email(), uuid: () => faker.string.uuid(), date: () => faker.date.recent().toISOString().slice(0, 10),
  datetime: () => faker.date.recent().toISOString(), url: () => faker.internet.url(), name: () => faker.person.fullName(),
  avatar: () => faker.image.avatar(), price: () => faker.number.float({ min: 1, max: 1000, fractionDigits: 2 }), city: () => faker.location.city(),
  country: () => faker.location.country(), company: () => faker.company.name(), address: () => faker.location.streetAddress(),
  phone: () => faker.phone.number(), paragraph: () => faker.lorem.paragraph(), sentence: () => faker.lorem.sentence(),
  productName: () => `${faker.commerce.productAdjective()} ${faker.commerce.product()}`
};

export function resolveSchema(schema: Schema): unknown {
  if (Array.isArray(schema)) return schema[faker.number.int({ min: 0, max: schema.length - 1 })];
  if (schema && typeof schema === 'object') {
    const value = schema as Record<string, unknown>;
    if (value.type === 'enum') return (value.values as unknown[])[faker.number.int({ min: 0, max: (value.values as unknown[]).length - 1 })];
    if (value.type === 'array') return Array.from({ length: Number(value.count ?? 1) }, () => resolveSchema(value.items));
    if ('mock' in value && 'type' in value) return value.mock;
    if (typeof value.type === 'string' && aliases[value.type]) return aliases[value.type]();
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, resolveSchema(child)]));
  }
  if (typeof schema === 'string' && aliases[schema]) return aliases[schema]();
  return schema;
}

export function generateRecord(schema: Record<string, Schema>): Record<string, unknown> {
  return resolveSchema(schema) as Record<string, unknown>;
}

function validator(schema: Schema, partial = false): ZodTypeAny {
  if (Array.isArray(schema)) return z.union(schema.map(value => validator(value)) as [ZodTypeAny, ZodTypeAny, ...ZodTypeAny[]]);
  if (schema && typeof schema === 'object') {
    const value = schema as Record<string, unknown>;
    if (value.type === 'enum') return z.enum((value.values as string[]).length ? value.values as [string, ...string[]] : ['']);
    if (value.type === 'array') return z.array(validator(value.items));
    if ('mock' in value && 'type' in value) return z.unknown().refine(input => input === value.mock, 'Value must match mock value');
    if (typeof value.type === 'string' && aliases[value.type]) return validator(value.type);
    return objectValidator(value as Record<string, Schema>, partial);
  }
  if (typeof schema === 'string') {
    if (schema === 'string' || schema === 'name' || schema === 'avatar' || schema === 'city' || schema === 'country' || schema === 'company' || schema === 'address' || schema === 'phone' || schema === 'paragraph' || schema === 'sentence' || schema === 'productName' || schema === 'url') return z.string();
    if (schema === 'email') return z.string().email(); if (schema === 'uuid') return z.string().uuid();
    if (schema === 'number' || schema === 'price') return z.number(); if (schema === 'integer') return z.number().int();
    if (schema === 'boolean') return z.boolean(); if (schema === 'date' || schema === 'datetime') return z.string();
  }
  return z.literal(schema as never);
}

export function objectValidator(schema: Record<string, Schema>, partial = false, optionalKeys: string[] = []): z.AnyZodObject {
  const shape = Object.fromEntries(Object.entries(schema).map(([key, value]) => [key, optionalKeys.includes(key) ? validator(value, false).optional() : validator(value, false)]));
  const object = z.object(shape).strict();
  return partial ? object.partial() : object;
}

export function validateBody(schema: Schema, body: unknown, partial = false, optionalKeys: string[] = []) {
  return objectValidator(schema as Record<string, Schema>, partial, optionalKeys).safeParse(body);
}

export function setGenerationSeed(seed?: number) { if (seed !== undefined) faker.seed(seed); }
