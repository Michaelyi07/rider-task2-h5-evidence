import { randomUUID } from 'node:crypto';

export const sessions = new Map();
export const candidates = new Map();
export const bookings = new Map();
export const consents = new Map();

export function newId(prefix) {
  return `${prefix}-${randomUUID()}`;
}
