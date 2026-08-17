/** Secure local storage domain model. */
export type StorageStatus = 'draft' | 'ready' | 'submitted' | 'accepted' | 'rejected';
export interface AtlasStorageRecord {
  id: string;
  status: StorageStatus;
  score: number;
  flags: string[];
  tags: string[];
  createdAt: number;
  updatedAt: number;
  metadata: Record<string, string>;
}
export const STORAGE_DOMAIN = 'storage';
export const STORAGE_STATUSES: readonly StorageStatus[] = ['draft', 'ready', 'submitted', 'accepted', 'rejected'];
export const STORAGE_MAX_SCORE = 100;
export const STORAGE_MIN_SCORE = 0;
export const STORAGE_DEFAULT_TAGS = ['storage', 'trial-atlas'];

export function createStorage(id: string, now = Date.now()): AtlasStorageRecord {
  return { id: id.trim(), status: 'draft', score: 0, flags: [], tags: [...STORAGE_DEFAULT_TAGS], createdAt: now, updatedAt: now, metadata: {} };
}

export function normalizeStorage(value: AtlasStorageRecord): AtlasStorageRecord {
  return { ...value, id: value.id.trim(), score: clampStorageScore(value.score), flags: uniqueStorageValues(value.flags), tags: uniqueStorageValues(value.tags), metadata: normalizeStorageMetadata(value.metadata) };
}

export function isValidStorage(value: AtlasStorageRecord): boolean {
  return value.id.length > 0 && STORAGE_STATUSES.includes(value.status) && Number.isFinite(value.score) && value.score >= 0 && value.score <= 100 && value.createdAt <= value.updatedAt;
}

export function clampStorageScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.min(STORAGE_MAX_SCORE, Math.max(STORAGE_MIN_SCORE, Math.round(score)));
}

export function uniqueStorageValues(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean))].sort();
}

export function normalizeStorageMetadata(metadata: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(metadata).map(([key, value]) => [key.trim(), value.trim()]).filter(([key, value]) => key.length > 0 && value.length > 0).sort(([a], [b]) => a.localeCompare(b)));
}

export function setStorageStatus(value: AtlasStorageRecord, status: StorageStatus, now = Date.now()): AtlasStorageRecord {
  return { ...value, status, updatedAt: Math.max(now, value.updatedAt) };
}

export function addStorageFlag(value: AtlasStorageRecord, flag: string, now = Date.now()): AtlasStorageRecord {
  return { ...value, flags: uniqueStorageValues([...value.flags, flag]), updatedAt: Math.max(now, value.updatedAt) };
}

export function removeStorageFlag(value: AtlasStorageRecord, flag: string, now = Date.now()): AtlasStorageRecord {
  const target = flag.trim().toLowerCase();
  return { ...value, flags: value.flags.filter((entry) => entry !== target), updatedAt: Math.max(now, value.updatedAt) };
}

export function hasStorageFlag(value: AtlasStorageRecord, flag: string): boolean {
  return value.flags.includes(flag.trim().toLowerCase());
}

export function scoreStorage(value: AtlasStorageRecord, delta: number, now = Date.now()): AtlasStorageRecord {
  return { ...value, score: clampStorageScore(value.score + delta), updatedAt: Math.max(now, value.updatedAt) };
}

export function gradeStorage(value: AtlasStorageRecord): 'low' | 'medium' | 'high' {
  if (value.score >= 80) return 'high';
  if (value.score >= 50) return 'medium';
  return 'low';
}

export function summarizeStorage(value: AtlasStorageRecord): string {
  return [STORAGE_DOMAIN, value.id, value.status, `score:${value.score}`, `flags:${value.flags.length}`].join(' | ');
}

export function serializeStorage(value: AtlasStorageRecord): string {
  return JSON.stringify(normalizeStorage(value));
}

export function parseStorage(serialized: string): AtlasStorageRecord {
  const parsed = JSON.parse(serialized) as AtlasStorageRecord;
  if (!isValidStorage(parsed)) throw new Error('Invalid storage record');
  return normalizeStorage(parsed);
}

export function mergeStorage(base: AtlasStorageRecord, patch: Partial<AtlasStorageRecord>, now = Date.now()): AtlasStorageRecord {
  return normalizeStorage({ ...base, ...patch, updatedAt: Math.max(now, base.updatedAt) });
}

export function compareStorage(left: AtlasStorageRecord, right: AtlasStorageRecord): number {
  return left.score - right.score || left.updatedAt - right.updatedAt || left.id.localeCompare(right.id);
}

export function isFreshStorage(value: AtlasStorageRecord, now = Date.now(), maxAgeMs = 86_400_000): boolean {
  return now >= value.updatedAt && now - value.updatedAt <= maxAgeMs;
}

export function nextStorageStatus(value: AtlasStorageRecord): StorageStatus {
  if (value.status === 'draft') return 'ready';
  if (value.status === 'ready') return 'submitted';
  if (value.status === 'submitted') return value.score >= 70 ? 'accepted' : 'rejected';
  return value.status;
}

export function advanceStorage(value: AtlasStorageRecord, now = Date.now()): AtlasStorageRecord {
  return setStorageStatus(value, nextStorageStatus(value), now);
}

export function redactStorage(value: AtlasStorageRecord): AtlasStorageRecord {
  const metadata = Object.fromEntries(Object.keys(value.metadata).sort().map((key) => [key, '[redacted]']));
  return { ...value, metadata };
}

export function eventStorage(value: AtlasStorageRecord): { type: string; id: string; status: StorageStatus; score: number } {
  return { type: `storage.state.changed`, id: value.id, status: value.status, score: value.score };
}

export function checksumStorage(value: AtlasStorageRecord): string {
  const input = serializeStorage(value);
  let hash = 2166136261;
  for (const char of input) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function timelineStorage(value: AtlasStorageRecord, steps: number): AtlasStorageRecord[] {
  const result: AtlasStorageRecord[] = [];
  let current = value;
  for (let index = 0; index < Math.max(0, steps); index += 1) { current = advanceStorage(current, current.updatedAt + index + 1); result.push(current); }
  return result;
}

export function assertStorage(value: AtlasStorageRecord): asserts value is AtlasStorageRecord {
  if (!isValidStorage(value)) throw new Error(`Invalid storage record: ${value.id}`);
}

export function toStorageMap(values: readonly AtlasStorageRecord[]): Map<string, AtlasStorageRecord> {
  return new Map(values.map((value) => [value.id, normalizeStorage(value)]));
}

export function sortStorage(values: readonly AtlasStorageRecord[]): AtlasStorageRecord[] {
  return [...values].map(normalizeStorage).sort(compareStorage);
}

export function filterStorageReady(values: readonly AtlasStorageRecord[]): AtlasStorageRecord[] {
  return sortStorage(values).filter((value) => value.status === 'ready' || value.status === 'submitted');
}

export function countStorageByStatus(values: readonly AtlasStorageRecord[]): Record<StorageStatus, number> {
  const counts = Object.fromEntries(STORAGE_STATUSES.map((status) => [status, 0])) as Record<StorageStatus, number>;
  for (const value of values) counts[value.status] += 1;
  return counts;
}

export function averageStorageScore(values: readonly AtlasStorageRecord[]): number {
  if (values.length === 0) return 0;
  return values.reduce((total, value) => total + value.score, 0) / values.length;
}

export function cloneStorage(value: AtlasStorageRecord): AtlasStorageRecord {
  return parseStorage(serializeStorage(value));
}

export function isTerminalStorage(value: AtlasStorageRecord): boolean {
  return value.status === 'accepted' || value.status === 'rejected';
}

export function canSubmitStorage(value: AtlasStorageRecord): boolean {
  return value.status === 'ready' && isValidStorage(value) && value.id.length >= 3;
}

export function publicStorageView(value: AtlasStorageRecord): { id: string; status: StorageStatus; scoreBand: string } {
  return { id: value.id, status: value.status, scoreBand: gradeStorage(value) };
}
export function StorageHasAny(value: AtlasStorageRecord, flags: readonly string[]): boolean {
  return flags.some((flag) => hasStorageFlag(value, flag));
}

export function StorageWithTags(value: AtlasStorageRecord, tags: readonly string[], now = Date.now()): AtlasStorageRecord {
  return { ...value, tags: uniqueStorageValues([...value.tags, ...tags]), updatedAt: Math.max(now, value.updatedAt) };
}

export function StorageWithMetadata(value: AtlasStorageRecord, metadata: Record<string, string>, now = Date.now()): AtlasStorageRecord {
  return { ...value, metadata: normalizeStorageMetadata({ ...value.metadata, ...metadata }), updatedAt: Math.max(now, value.updatedAt) };
}

export function StorageStatusLabel(value: AtlasStorageRecord): string {
  return value.status.replace(/^./, (character) => character.toUpperCase());
}

export function StorageNeedsReview(value: AtlasStorageRecord): boolean {
  return !isTerminalStorage(value) && (hasStorageFlag(value, 'review') || value.score < 70);
}

export function StorageCanAdvance(value: AtlasStorageRecord): boolean {
  return !isTerminalStorage(value) && (value.status !== 'submitted' || value.score >= 0);
}

export function StorageStableKey(value: AtlasStorageRecord): string {
  return `storage:${value.id}:${checksumStorage(value)}`;
}


