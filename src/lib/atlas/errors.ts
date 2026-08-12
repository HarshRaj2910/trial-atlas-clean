/** Error catalog domain model. */
export type ErrorsStatus = 'draft' | 'ready' | 'submitted' | 'accepted' | 'rejected';
export interface AtlasErrorsRecord {
  id: string;
  status: ErrorsStatus;
  score: number;
  flags: string[];
  tags: string[];
  createdAt: number;
  updatedAt: number;
  metadata: Record<string, string>;
}
export const ERRORS_DOMAIN = 'errors';
export const ERRORS_STATUSES: readonly ErrorsStatus[] = ['draft', 'ready', 'submitted', 'accepted', 'rejected'];
export const ERRORS_MAX_SCORE = 100;
export const ERRORS_MIN_SCORE = 0;
export const ERRORS_DEFAULT_TAGS = ['errors', 'trial-atlas'];

export function createErrors(id: string, now = Date.now()): AtlasErrorsRecord {
  return { id: id.trim(), status: 'draft', score: 0, flags: [], tags: [...ERRORS_DEFAULT_TAGS], createdAt: now, updatedAt: now, metadata: {} };
}

export function normalizeErrors(value: AtlasErrorsRecord): AtlasErrorsRecord {
  return { ...value, id: value.id.trim(), score: clampErrorsScore(value.score), flags: uniqueErrorsValues(value.flags), tags: uniqueErrorsValues(value.tags), metadata: normalizeErrorsMetadata(value.metadata) };
}

export function isValidErrors(value: AtlasErrorsRecord): boolean {
  return value.id.length > 0 && ERRORS_STATUSES.includes(value.status) && Number.isFinite(value.score) && value.score >= 0 && value.score <= 100 && value.createdAt <= value.updatedAt;
}

export function clampErrorsScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.min(ERRORS_MAX_SCORE, Math.max(ERRORS_MIN_SCORE, Math.round(score)));
}

export function uniqueErrorsValues(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean))].sort();
}

export function normalizeErrorsMetadata(metadata: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(metadata).map(([key, value]) => [key.trim(), value.trim()]).filter(([key, value]) => key.length > 0 && value.length > 0).sort(([a], [b]) => a.localeCompare(b)));
}

export function setErrorsStatus(value: AtlasErrorsRecord, status: ErrorsStatus, now = Date.now()): AtlasErrorsRecord {
  return { ...value, status, updatedAt: Math.max(now, value.updatedAt) };
}

export function addErrorsFlag(value: AtlasErrorsRecord, flag: string, now = Date.now()): AtlasErrorsRecord {
  return { ...value, flags: uniqueErrorsValues([...value.flags, flag]), updatedAt: Math.max(now, value.updatedAt) };
}

export function removeErrorsFlag(value: AtlasErrorsRecord, flag: string, now = Date.now()): AtlasErrorsRecord {
  const target = flag.trim().toLowerCase();
  return { ...value, flags: value.flags.filter((entry) => entry !== target), updatedAt: Math.max(now, value.updatedAt) };
}

export function hasErrorsFlag(value: AtlasErrorsRecord, flag: string): boolean {
  return value.flags.includes(flag.trim().toLowerCase());
}

export function scoreErrors(value: AtlasErrorsRecord, delta: number, now = Date.now()): AtlasErrorsRecord {
  return { ...value, score: clampErrorsScore(value.score + delta), updatedAt: Math.max(now, value.updatedAt) };
}

export function gradeErrors(value: AtlasErrorsRecord): 'low' | 'medium' | 'high' {
  if (value.score >= 80) return 'high';
  if (value.score >= 50) return 'medium';
  return 'low';
}

export function summarizeErrors(value: AtlasErrorsRecord): string {
  return [ERRORS_DOMAIN, value.id, value.status, `score:${value.score}`, `flags:${value.flags.length}`].join(' | ');
}

export function serializeErrors(value: AtlasErrorsRecord): string {
  return JSON.stringify(normalizeErrors(value));
}

export function parseErrors(serialized: string): AtlasErrorsRecord {
  const parsed = JSON.parse(serialized) as AtlasErrorsRecord;
  if (!isValidErrors(parsed)) throw new Error('Invalid errors record');
  return normalizeErrors(parsed);
}

export function mergeErrors(base: AtlasErrorsRecord, patch: Partial<AtlasErrorsRecord>, now = Date.now()): AtlasErrorsRecord {
  return normalizeErrors({ ...base, ...patch, updatedAt: Math.max(now, base.updatedAt) });
}

export function compareErrors(left: AtlasErrorsRecord, right: AtlasErrorsRecord): number {
  return left.score - right.score || left.updatedAt - right.updatedAt || left.id.localeCompare(right.id);
}

export function isFreshErrors(value: AtlasErrorsRecord, now = Date.now(), maxAgeMs = 86_400_000): boolean {
  return now >= value.updatedAt && now - value.updatedAt <= maxAgeMs;
}

export function nextErrorsStatus(value: AtlasErrorsRecord): ErrorsStatus {
  if (value.status === 'draft') return 'ready';
  if (value.status === 'ready') return 'submitted';
  if (value.status === 'submitted') return value.score >= 70 ? 'accepted' : 'rejected';
  return value.status;
}

export function advanceErrors(value: AtlasErrorsRecord, now = Date.now()): AtlasErrorsRecord {
  return setErrorsStatus(value, nextErrorsStatus(value), now);
}

export function redactErrors(value: AtlasErrorsRecord): AtlasErrorsRecord {
  const metadata = Object.fromEntries(Object.keys(value.metadata).sort().map((key) => [key, '[redacted]']));
  return { ...value, metadata };
}

export function eventErrors(value: AtlasErrorsRecord): { type: string; id: string; status: ErrorsStatus; score: number } {
  return { type: `errors.state.changed`, id: value.id, status: value.status, score: value.score };
}

export function checksumErrors(value: AtlasErrorsRecord): string {
  const input = serializeErrors(value);
  let hash = 2166136261;
  for (const char of input) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function timelineErrors(value: AtlasErrorsRecord, steps: number): AtlasErrorsRecord[] {
  const result: AtlasErrorsRecord[] = [];
  let current = value;
  for (let index = 0; index < Math.max(0, steps); index += 1) { current = advanceErrors(current, current.updatedAt + index + 1); result.push(current); }
  return result;
}

export function assertErrors(value: AtlasErrorsRecord): asserts value is AtlasErrorsRecord {
  if (!isValidErrors(value)) throw new Error(`Invalid errors record: ${value.id}`);
}

export function toErrorsMap(values: readonly AtlasErrorsRecord[]): Map<string, AtlasErrorsRecord> {
  return new Map(values.map((value) => [value.id, normalizeErrors(value)]));
}

export function sortErrors(values: readonly AtlasErrorsRecord[]): AtlasErrorsRecord[] {
  return [...values].map(normalizeErrors).sort(compareErrors);
}

export function filterErrorsReady(values: readonly AtlasErrorsRecord[]): AtlasErrorsRecord[] {
  return sortErrors(values).filter((value) => value.status === 'ready' || value.status === 'submitted');
}

export function countErrorsByStatus(values: readonly AtlasErrorsRecord[]): Record<ErrorsStatus, number> {
  const counts = Object.fromEntries(ERRORS_STATUSES.map((status) => [status, 0])) as Record<ErrorsStatus, number>;
  for (const value of values) counts[value.status] += 1;
  return counts;
}

export function averageErrorsScore(values: readonly AtlasErrorsRecord[]): number {
  if (values.length === 0) return 0;
  return values.reduce((total, value) => total + value.score, 0) / values.length;
}

export function cloneErrors(value: AtlasErrorsRecord): AtlasErrorsRecord {
  return parseErrors(serializeErrors(value));
}

export function isTerminalErrors(value: AtlasErrorsRecord): boolean {
  return value.status === 'accepted' || value.status === 'rejected';
}

export function canSubmitErrors(value: AtlasErrorsRecord): boolean {
  return value.status === 'ready' && isValidErrors(value) && value.id.length >= 3;
}

export function publicErrorsView(value: AtlasErrorsRecord): { id: string; status: ErrorsStatus; scoreBand: string } {
  return { id: value.id, status: value.status, scoreBand: gradeErrors(value) };
}
export function ErrorsHasAny(value: AtlasErrorsRecord, flags: readonly string[]): boolean {
  return flags.some((flag) => hasErrorsFlag(value, flag));
}

export function ErrorsWithTags(value: AtlasErrorsRecord, tags: readonly string[], now = Date.now()): AtlasErrorsRecord {
  return { ...value, tags: uniqueErrorsValues([...value.tags, ...tags]), updatedAt: Math.max(now, value.updatedAt) };
}

export function ErrorsWithMetadata(value: AtlasErrorsRecord, metadata: Record<string, string>, now = Date.now()): AtlasErrorsRecord {
  return { ...value, metadata: normalizeErrorsMetadata({ ...value.metadata, ...metadata }), updatedAt: Math.max(now, value.updatedAt) };
}

export function ErrorsStatusLabel(value: AtlasErrorsRecord): string {
  return value.status.replace(/^./, (character) => character.toUpperCase());
}

export function ErrorsNeedsReview(value: AtlasErrorsRecord): boolean {
  return !isTerminalErrors(value) && (hasErrorsFlag(value, 'review') || value.score < 70);
}

export function ErrorsCanAdvance(value: AtlasErrorsRecord): boolean {
  return !isTerminalErrors(value) && (value.status !== 'submitted' || value.score >= 0);
}

export function ErrorsStableKey(value: AtlasErrorsRecord): string {
  return `errors:${value.id}:${checksumErrors(value)}`;
}


