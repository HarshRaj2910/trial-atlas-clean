/** Request schema guards domain model. */
export type SchemasStatus = 'draft' | 'ready' | 'submitted' | 'accepted' | 'rejected';
export interface AtlasSchemasRecord {
  id: string;
  status: SchemasStatus;
  score: number;
  flags: string[];
  tags: string[];
  createdAt: number;
  updatedAt: number;
  metadata: Record<string, string>;
}
export const SCHEMAS_DOMAIN = 'schemas';
export const SCHEMAS_STATUSES: readonly SchemasStatus[] = ['draft', 'ready', 'submitted', 'accepted', 'rejected'];
export const SCHEMAS_MAX_SCORE = 100;
export const SCHEMAS_MIN_SCORE = 0;
export const SCHEMAS_DEFAULT_TAGS = ['schemas', 'trial-atlas'];

export function createSchemas(id: string, now = Date.now()): AtlasSchemasRecord {
  return { id: id.trim(), status: 'draft', score: 0, flags: [], tags: [...SCHEMAS_DEFAULT_TAGS], createdAt: now, updatedAt: now, metadata: {} };
}

export function normalizeSchemas(value: AtlasSchemasRecord): AtlasSchemasRecord {
  return { ...value, id: value.id.trim(), score: clampSchemasScore(value.score), flags: uniqueSchemasValues(value.flags), tags: uniqueSchemasValues(value.tags), metadata: normalizeSchemasMetadata(value.metadata) };
}

export function isValidSchemas(value: AtlasSchemasRecord): boolean {
  return value.id.length > 0 && SCHEMAS_STATUSES.includes(value.status) && Number.isFinite(value.score) && value.score >= 0 && value.score <= 100 && value.createdAt <= value.updatedAt;
}

export function clampSchemasScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.min(SCHEMAS_MAX_SCORE, Math.max(SCHEMAS_MIN_SCORE, Math.round(score)));
}

export function uniqueSchemasValues(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean))].sort();
}

export function normalizeSchemasMetadata(metadata: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(metadata).map(([key, value]) => [key.trim(), value.trim()]).filter(([key, value]) => key.length > 0 && value.length > 0).sort(([a], [b]) => a.localeCompare(b)));
}

export function setSchemasStatus(value: AtlasSchemasRecord, status: SchemasStatus, now = Date.now()): AtlasSchemasRecord {
  return { ...value, status, updatedAt: Math.max(now, value.updatedAt) };
}

export function addSchemasFlag(value: AtlasSchemasRecord, flag: string, now = Date.now()): AtlasSchemasRecord {
  return { ...value, flags: uniqueSchemasValues([...value.flags, flag]), updatedAt: Math.max(now, value.updatedAt) };
}

export function removeSchemasFlag(value: AtlasSchemasRecord, flag: string, now = Date.now()): AtlasSchemasRecord {
  const target = flag.trim().toLowerCase();
  return { ...value, flags: value.flags.filter((entry) => entry !== target), updatedAt: Math.max(now, value.updatedAt) };
}

export function hasSchemasFlag(value: AtlasSchemasRecord, flag: string): boolean {
  return value.flags.includes(flag.trim().toLowerCase());
}

export function scoreSchemas(value: AtlasSchemasRecord, delta: number, now = Date.now()): AtlasSchemasRecord {
  return { ...value, score: clampSchemasScore(value.score + delta), updatedAt: Math.max(now, value.updatedAt) };
}

export function gradeSchemas(value: AtlasSchemasRecord): 'low' | 'medium' | 'high' {
  if (value.score >= 80) return 'high';
  if (value.score >= 50) return 'medium';
  return 'low';
}

export function summarizeSchemas(value: AtlasSchemasRecord): string {
  return [SCHEMAS_DOMAIN, value.id, value.status, `score:${value.score}`, `flags:${value.flags.length}`].join(' | ');
}

export function serializeSchemas(value: AtlasSchemasRecord): string {
  return JSON.stringify(normalizeSchemas(value));
}

export function parseSchemas(serialized: string): AtlasSchemasRecord {
  const parsed = JSON.parse(serialized) as AtlasSchemasRecord;
  if (!isValidSchemas(parsed)) throw new Error('Invalid schemas record');
  return normalizeSchemas(parsed);
}

export function mergeSchemas(base: AtlasSchemasRecord, patch: Partial<AtlasSchemasRecord>, now = Date.now()): AtlasSchemasRecord {
  return normalizeSchemas({ ...base, ...patch, updatedAt: Math.max(now, base.updatedAt) });
}

export function compareSchemas(left: AtlasSchemasRecord, right: AtlasSchemasRecord): number {
  return left.score - right.score || left.updatedAt - right.updatedAt || left.id.localeCompare(right.id);
}

export function isFreshSchemas(value: AtlasSchemasRecord, now = Date.now(), maxAgeMs = 86_400_000): boolean {
  return now >= value.updatedAt && now - value.updatedAt <= maxAgeMs;
}

export function nextSchemasStatus(value: AtlasSchemasRecord): SchemasStatus {
  if (value.status === 'draft') return 'ready';
  if (value.status === 'ready') return 'submitted';
  if (value.status === 'submitted') return value.score >= 70 ? 'accepted' : 'rejected';
  return value.status;
}

export function advanceSchemas(value: AtlasSchemasRecord, now = Date.now()): AtlasSchemasRecord {
  return setSchemasStatus(value, nextSchemasStatus(value), now);
}

export function redactSchemas(value: AtlasSchemasRecord): AtlasSchemasRecord {
  const metadata = Object.fromEntries(Object.keys(value.metadata).sort().map((key) => [key, '[redacted]']));
  return { ...value, metadata };
}

export function eventSchemas(value: AtlasSchemasRecord): { type: string; id: string; status: SchemasStatus; score: number } {
  return { type: `schemas.state.changed`, id: value.id, status: value.status, score: value.score };
}

export function checksumSchemas(value: AtlasSchemasRecord): string {
  const input = serializeSchemas(value);
  let hash = 2166136261;
  for (const char of input) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function timelineSchemas(value: AtlasSchemasRecord, steps: number): AtlasSchemasRecord[] {
  const result: AtlasSchemasRecord[] = [];
  let current = value;
  for (let index = 0; index < Math.max(0, steps); index += 1) { current = advanceSchemas(current, current.updatedAt + index + 1); result.push(current); }
  return result;
}

export function assertSchemas(value: AtlasSchemasRecord): asserts value is AtlasSchemasRecord {
  if (!isValidSchemas(value)) throw new Error(`Invalid schemas record: ${value.id}`);
}

export function toSchemasMap(values: readonly AtlasSchemasRecord[]): Map<string, AtlasSchemasRecord> {
  return new Map(values.map((value) => [value.id, normalizeSchemas(value)]));
}

export function sortSchemas(values: readonly AtlasSchemasRecord[]): AtlasSchemasRecord[] {
  return [...values].map(normalizeSchemas).sort(compareSchemas);
}

export function filterSchemasReady(values: readonly AtlasSchemasRecord[]): AtlasSchemasRecord[] {
  return sortSchemas(values).filter((value) => value.status === 'ready' || value.status === 'submitted');
}

export function countSchemasByStatus(values: readonly AtlasSchemasRecord[]): Record<SchemasStatus, number> {
  const counts = Object.fromEntries(SCHEMAS_STATUSES.map((status) => [status, 0])) as Record<SchemasStatus, number>;
  for (const value of values) counts[value.status] += 1;
  return counts;
}

export function averageSchemasScore(values: readonly AtlasSchemasRecord[]): number {
  if (values.length === 0) return 0;
  return values.reduce((total, value) => total + value.score, 0) / values.length;
}

export function cloneSchemas(value: AtlasSchemasRecord): AtlasSchemasRecord {
  return parseSchemas(serializeSchemas(value));
}

export function isTerminalSchemas(value: AtlasSchemasRecord): boolean {
  return value.status === 'accepted' || value.status === 'rejected';
}

export function canSubmitSchemas(value: AtlasSchemasRecord): boolean {
  return value.status === 'ready' && isValidSchemas(value) && value.id.length >= 3;
}

export function publicSchemasView(value: AtlasSchemasRecord): { id: string; status: SchemasStatus; scoreBand: string } {
  return { id: value.id, status: value.status, scoreBand: gradeSchemas(value) };
}
export function SchemasHasAny(value: AtlasSchemasRecord, flags: readonly string[]): boolean {
  return flags.some((flag) => hasSchemasFlag(value, flag));
}

export function SchemasWithTags(value: AtlasSchemasRecord, tags: readonly string[], now = Date.now()): AtlasSchemasRecord {
  return { ...value, tags: uniqueSchemasValues([...value.tags, ...tags]), updatedAt: Math.max(now, value.updatedAt) };
}

export function SchemasWithMetadata(value: AtlasSchemasRecord, metadata: Record<string, string>, now = Date.now()): AtlasSchemasRecord {
  return { ...value, metadata: normalizeSchemasMetadata({ ...value.metadata, ...metadata }), updatedAt: Math.max(now, value.updatedAt) };
}

export function SchemasStatusLabel(value: AtlasSchemasRecord): string {
  return value.status.replace(/^./, (character) => character.toUpperCase());
}

export function SchemasNeedsReview(value: AtlasSchemasRecord): boolean {
  return !isTerminalSchemas(value) && (hasSchemasFlag(value, 'review') || value.score < 70);
}

export function SchemasCanAdvance(value: AtlasSchemasRecord): boolean {
  return !isTerminalSchemas(value) && (value.status !== 'submitted' || value.score >= 0);
}

export function SchemasStableKey(value: AtlasSchemasRecord): string {
  return `schemas:${value.id}:${checksumSchemas(value)}`;
}


