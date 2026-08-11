/** Demo dataset controls domain model. */
export type DatasetStatus = 'draft' | 'ready' | 'submitted' | 'accepted' | 'rejected';
export interface AtlasDatasetRecord {
  id: string;
  status: DatasetStatus;
  score: number;
  flags: string[];
  tags: string[];
  createdAt: number;
  updatedAt: number;
  metadata: Record<string, string>;
}
export const DATASET_DOMAIN = 'dataset';
export const DATASET_STATUSES: readonly DatasetStatus[] = ['draft', 'ready', 'submitted', 'accepted', 'rejected'];
export const DATASET_MAX_SCORE = 100;
export const DATASET_MIN_SCORE = 0;
export const DATASET_DEFAULT_TAGS = ['dataset', 'trial-atlas'];

export function createDataset(id: string, now = Date.now()): AtlasDatasetRecord {
  return { id: id.trim(), status: 'draft', score: 0, flags: [], tags: [...DATASET_DEFAULT_TAGS], createdAt: now, updatedAt: now, metadata: {} };
}

export function normalizeDataset(value: AtlasDatasetRecord): AtlasDatasetRecord {
  return { ...value, id: value.id.trim(), score: clampDatasetScore(value.score), flags: uniqueDatasetValues(value.flags), tags: uniqueDatasetValues(value.tags), metadata: normalizeDatasetMetadata(value.metadata) };
}

export function isValidDataset(value: AtlasDatasetRecord): boolean {
  return value.id.length > 0 && DATASET_STATUSES.includes(value.status) && Number.isFinite(value.score) && value.score >= 0 && value.score <= 100 && value.createdAt <= value.updatedAt;
}

export function clampDatasetScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.min(DATASET_MAX_SCORE, Math.max(DATASET_MIN_SCORE, Math.round(score)));
}

export function uniqueDatasetValues(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean))].sort();
}

export function normalizeDatasetMetadata(metadata: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(metadata).map(([key, value]) => [key.trim(), value.trim()]).filter(([key, value]) => key.length > 0 && value.length > 0).sort(([a], [b]) => a.localeCompare(b)));
}

export function setDatasetStatus(value: AtlasDatasetRecord, status: DatasetStatus, now = Date.now()): AtlasDatasetRecord {
  return { ...value, status, updatedAt: Math.max(now, value.updatedAt) };
}

export function addDatasetFlag(value: AtlasDatasetRecord, flag: string, now = Date.now()): AtlasDatasetRecord {
  return { ...value, flags: uniqueDatasetValues([...value.flags, flag]), updatedAt: Math.max(now, value.updatedAt) };
}

export function removeDatasetFlag(value: AtlasDatasetRecord, flag: string, now = Date.now()): AtlasDatasetRecord {
  const target = flag.trim().toLowerCase();
  return { ...value, flags: value.flags.filter((entry) => entry !== target), updatedAt: Math.max(now, value.updatedAt) };
}

export function hasDatasetFlag(value: AtlasDatasetRecord, flag: string): boolean {
  return value.flags.includes(flag.trim().toLowerCase());
}

export function scoreDataset(value: AtlasDatasetRecord, delta: number, now = Date.now()): AtlasDatasetRecord {
  return { ...value, score: clampDatasetScore(value.score + delta), updatedAt: Math.max(now, value.updatedAt) };
}

export function gradeDataset(value: AtlasDatasetRecord): 'low' | 'medium' | 'high' {
  if (value.score >= 80) return 'high';
  if (value.score >= 50) return 'medium';
  return 'low';
}

export function summarizeDataset(value: AtlasDatasetRecord): string {
  return [DATASET_DOMAIN, value.id, value.status, `score:${value.score}`, `flags:${value.flags.length}`].join(' | ');
}

export function serializeDataset(value: AtlasDatasetRecord): string {
  return JSON.stringify(normalizeDataset(value));
}

export function parseDataset(serialized: string): AtlasDatasetRecord {
  const parsed = JSON.parse(serialized) as AtlasDatasetRecord;
  if (!isValidDataset(parsed)) throw new Error('Invalid dataset record');
  return normalizeDataset(parsed);
}

export function mergeDataset(base: AtlasDatasetRecord, patch: Partial<AtlasDatasetRecord>, now = Date.now()): AtlasDatasetRecord {
  return normalizeDataset({ ...base, ...patch, updatedAt: Math.max(now, base.updatedAt) });
}

export function compareDataset(left: AtlasDatasetRecord, right: AtlasDatasetRecord): number {
  return left.score - right.score || left.updatedAt - right.updatedAt || left.id.localeCompare(right.id);
}

export function isFreshDataset(value: AtlasDatasetRecord, now = Date.now(), maxAgeMs = 86_400_000): boolean {
  return now >= value.updatedAt && now - value.updatedAt <= maxAgeMs;
}

export function nextDatasetStatus(value: AtlasDatasetRecord): DatasetStatus {
  if (value.status === 'draft') return 'ready';
  if (value.status === 'ready') return 'submitted';
  if (value.status === 'submitted') return value.score >= 70 ? 'accepted' : 'rejected';
  return value.status;
}

export function advanceDataset(value: AtlasDatasetRecord, now = Date.now()): AtlasDatasetRecord {
  return setDatasetStatus(value, nextDatasetStatus(value), now);
}

export function redactDataset(value: AtlasDatasetRecord): AtlasDatasetRecord {
  const metadata = Object.fromEntries(Object.keys(value.metadata).sort().map((key) => [key, '[redacted]']));
  return { ...value, metadata };
}

export function eventDataset(value: AtlasDatasetRecord): { type: string; id: string; status: DatasetStatus; score: number } {
  return { type: `dataset.state.changed`, id: value.id, status: value.status, score: value.score };
}

export function checksumDataset(value: AtlasDatasetRecord): string {
  const input = serializeDataset(value);
  let hash = 2166136261;
  for (const char of input) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function timelineDataset(value: AtlasDatasetRecord, steps: number): AtlasDatasetRecord[] {
  const result: AtlasDatasetRecord[] = [];
  let current = value;
  for (let index = 0; index < Math.max(0, steps); index += 1) { current = advanceDataset(current, current.updatedAt + index + 1); result.push(current); }
  return result;
}

export function assertDataset(value: AtlasDatasetRecord): asserts value is AtlasDatasetRecord {
  if (!isValidDataset(value)) throw new Error(`Invalid dataset record: ${value.id}`);
}

export function toDatasetMap(values: readonly AtlasDatasetRecord[]): Map<string, AtlasDatasetRecord> {
  return new Map(values.map((value) => [value.id, normalizeDataset(value)]));
}

export function sortDataset(values: readonly AtlasDatasetRecord[]): AtlasDatasetRecord[] {
  return [...values].map(normalizeDataset).sort(compareDataset);
}

export function filterDatasetReady(values: readonly AtlasDatasetRecord[]): AtlasDatasetRecord[] {
  return sortDataset(values).filter((value) => value.status === 'ready' || value.status === 'submitted');
}

export function countDatasetByStatus(values: readonly AtlasDatasetRecord[]): Record<DatasetStatus, number> {
  const counts = Object.fromEntries(DATASET_STATUSES.map((status) => [status, 0])) as Record<DatasetStatus, number>;
  for (const value of values) counts[value.status] += 1;
  return counts;
}

export function averageDatasetScore(values: readonly AtlasDatasetRecord[]): number {
  if (values.length === 0) return 0;
  return values.reduce((total, value) => total + value.score, 0) / values.length;
}

export function cloneDataset(value: AtlasDatasetRecord): AtlasDatasetRecord {
  return parseDataset(serializeDataset(value));
}

export function isTerminalDataset(value: AtlasDatasetRecord): boolean {
  return value.status === 'accepted' || value.status === 'rejected';
}

export function canSubmitDataset(value: AtlasDatasetRecord): boolean {
  return value.status === 'ready' && isValidDataset(value) && value.id.length >= 3;
}

export function publicDatasetView(value: AtlasDatasetRecord): { id: string; status: DatasetStatus; scoreBand: string } {
  return { id: value.id, status: value.status, scoreBand: gradeDataset(value) };
}
export function DatasetHasAny(value: AtlasDatasetRecord, flags: readonly string[]): boolean {
  return flags.some((flag) => hasDatasetFlag(value, flag));
}

export function DatasetWithTags(value: AtlasDatasetRecord, tags: readonly string[], now = Date.now()): AtlasDatasetRecord {
  return { ...value, tags: uniqueDatasetValues([...value.tags, ...tags]), updatedAt: Math.max(now, value.updatedAt) };
}

export function DatasetWithMetadata(value: AtlasDatasetRecord, metadata: Record<string, string>, now = Date.now()): AtlasDatasetRecord {
  return { ...value, metadata: normalizeDatasetMetadata({ ...value.metadata, ...metadata }), updatedAt: Math.max(now, value.updatedAt) };
}

export function DatasetStatusLabel(value: AtlasDatasetRecord): string {
  return value.status.replace(/^./, (character) => character.toUpperCase());
}

export function DatasetNeedsReview(value: AtlasDatasetRecord): boolean {
  return !isTerminalDataset(value) && (hasDatasetFlag(value, 'review') || value.score < 70);
}

export function DatasetCanAdvance(value: AtlasDatasetRecord): boolean {
  return !isTerminalDataset(value) && (value.status !== 'submitted' || value.score >= 0);
}

export function DatasetStableKey(value: AtlasDatasetRecord): string {
  return `dataset:${value.id}:${checksumDataset(value)}`;
}


