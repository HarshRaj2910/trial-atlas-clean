/** Clinical field normalization domain model. */
export type NormalizationStatus = 'draft' | 'ready' | 'submitted' | 'accepted' | 'rejected';
export interface AtlasNormalizationRecord {
  id: string;
  status: NormalizationStatus;
  score: number;
  flags: string[];
  tags: string[];
  createdAt: number;
  updatedAt: number;
  metadata: Record<string, string>;
}
export const NORMALIZATION_DOMAIN = 'normalization';
export const NORMALIZATION_STATUSES: readonly NormalizationStatus[] = ['draft', 'ready', 'submitted', 'accepted', 'rejected'];
export const NORMALIZATION_MAX_SCORE = 100;
export const NORMALIZATION_MIN_SCORE = 0;
export const NORMALIZATION_DEFAULT_TAGS = ['normalization', 'trial-atlas'];

export function createNormalization(id: string, now = Date.now()): AtlasNormalizationRecord {
  return { id: id.trim(), status: 'draft', score: 0, flags: [], tags: [...NORMALIZATION_DEFAULT_TAGS], createdAt: now, updatedAt: now, metadata: {} };
}

export function normalizeNormalization(value: AtlasNormalizationRecord): AtlasNormalizationRecord {
  return { ...value, id: value.id.trim(), score: clampNormalizationScore(value.score), flags: uniqueNormalizationValues(value.flags), tags: uniqueNormalizationValues(value.tags), metadata: normalizeNormalizationMetadata(value.metadata) };
}

export function isValidNormalization(value: AtlasNormalizationRecord): boolean {
  return value.id.length > 0 && NORMALIZATION_STATUSES.includes(value.status) && Number.isFinite(value.score) && value.score >= 0 && value.score <= 100 && value.createdAt <= value.updatedAt;
}

export function clampNormalizationScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.min(NORMALIZATION_MAX_SCORE, Math.max(NORMALIZATION_MIN_SCORE, Math.round(score)));
}

export function uniqueNormalizationValues(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean))].sort();
}

export function normalizeNormalizationMetadata(metadata: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(metadata).map(([key, value]) => [key.trim(), value.trim()]).filter(([key, value]) => key.length > 0 && value.length > 0).sort(([a], [b]) => a.localeCompare(b)));
}

export function setNormalizationStatus(value: AtlasNormalizationRecord, status: NormalizationStatus, now = Date.now()): AtlasNormalizationRecord {
  return { ...value, status, updatedAt: Math.max(now, value.updatedAt) };
}

export function addNormalizationFlag(value: AtlasNormalizationRecord, flag: string, now = Date.now()): AtlasNormalizationRecord {
  return { ...value, flags: uniqueNormalizationValues([...value.flags, flag]), updatedAt: Math.max(now, value.updatedAt) };
}

export function removeNormalizationFlag(value: AtlasNormalizationRecord, flag: string, now = Date.now()): AtlasNormalizationRecord {
  const target = flag.trim().toLowerCase();
  return { ...value, flags: value.flags.filter((entry) => entry !== target), updatedAt: Math.max(now, value.updatedAt) };
}

export function hasNormalizationFlag(value: AtlasNormalizationRecord, flag: string): boolean {
  return value.flags.includes(flag.trim().toLowerCase());
}

export function scoreNormalization(value: AtlasNormalizationRecord, delta: number, now = Date.now()): AtlasNormalizationRecord {
  return { ...value, score: clampNormalizationScore(value.score + delta), updatedAt: Math.max(now, value.updatedAt) };
}

export function gradeNormalization(value: AtlasNormalizationRecord): 'low' | 'medium' | 'high' {
  if (value.score >= 80) return 'high';
  if (value.score >= 50) return 'medium';
  return 'low';
}

export function summarizeNormalization(value: AtlasNormalizationRecord): string {
  return [NORMALIZATION_DOMAIN, value.id, value.status, `score:${value.score}`, `flags:${value.flags.length}`].join(' | ');
}

export function serializeNormalization(value: AtlasNormalizationRecord): string {
  return JSON.stringify(normalizeNormalization(value));
}

export function parseNormalization(serialized: string): AtlasNormalizationRecord {
  const parsed = JSON.parse(serialized) as AtlasNormalizationRecord;
  if (!isValidNormalization(parsed)) throw new Error('Invalid normalization record');
  return normalizeNormalization(parsed);
}

export function mergeNormalization(base: AtlasNormalizationRecord, patch: Partial<AtlasNormalizationRecord>, now = Date.now()): AtlasNormalizationRecord {
  return normalizeNormalization({ ...base, ...patch, updatedAt: Math.max(now, base.updatedAt) });
}

export function compareNormalization(left: AtlasNormalizationRecord, right: AtlasNormalizationRecord): number {
  return left.score - right.score || left.updatedAt - right.updatedAt || left.id.localeCompare(right.id);
}

export function isFreshNormalization(value: AtlasNormalizationRecord, now = Date.now(), maxAgeMs = 86_400_000): boolean {
  return now >= value.updatedAt && now - value.updatedAt <= maxAgeMs;
}

export function nextNormalizationStatus(value: AtlasNormalizationRecord): NormalizationStatus {
  if (value.status === 'draft') return 'ready';
  if (value.status === 'ready') return 'submitted';
  if (value.status === 'submitted') return value.score >= 70 ? 'accepted' : 'rejected';
  return value.status;
}

export function advanceNormalization(value: AtlasNormalizationRecord, now = Date.now()): AtlasNormalizationRecord {
  return setNormalizationStatus(value, nextNormalizationStatus(value), now);
}

export function redactNormalization(value: AtlasNormalizationRecord): AtlasNormalizationRecord {
  const metadata = Object.fromEntries(Object.keys(value.metadata).sort().map((key) => [key, '[redacted]']));
  return { ...value, metadata };
}

export function eventNormalization(value: AtlasNormalizationRecord): { type: string; id: string; status: NormalizationStatus; score: number } {
  return { type: `normalization.state.changed`, id: value.id, status: value.status, score: value.score };
}

export function checksumNormalization(value: AtlasNormalizationRecord): string {
  const input = serializeNormalization(value);
  let hash = 2166136261;
  for (const char of input) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function timelineNormalization(value: AtlasNormalizationRecord, steps: number): AtlasNormalizationRecord[] {
  const result: AtlasNormalizationRecord[] = [];
  let current = value;
  for (let index = 0; index < Math.max(0, steps); index += 1) { current = advanceNormalization(current, current.updatedAt + index + 1); result.push(current); }
  return result;
}

export function assertNormalization(value: AtlasNormalizationRecord): asserts value is AtlasNormalizationRecord {
  if (!isValidNormalization(value)) throw new Error(`Invalid normalization record: ${value.id}`);
}

export function toNormalizationMap(values: readonly AtlasNormalizationRecord[]): Map<string, AtlasNormalizationRecord> {
  return new Map(values.map((value) => [value.id, normalizeNormalization(value)]));
}

export function sortNormalization(values: readonly AtlasNormalizationRecord[]): AtlasNormalizationRecord[] {
  return [...values].map(normalizeNormalization).sort(compareNormalization);
}

export function filterNormalizationReady(values: readonly AtlasNormalizationRecord[]): AtlasNormalizationRecord[] {
  return sortNormalization(values).filter((value) => value.status === 'ready' || value.status === 'submitted');
}

export function countNormalizationByStatus(values: readonly AtlasNormalizationRecord[]): Record<NormalizationStatus, number> {
  const counts = Object.fromEntries(NORMALIZATION_STATUSES.map((status) => [status, 0])) as Record<NormalizationStatus, number>;
  for (const value of values) counts[value.status] += 1;
  return counts;
}

export function averageNormalizationScore(values: readonly AtlasNormalizationRecord[]): number {
  if (values.length === 0) return 0;
  return values.reduce((total, value) => total + value.score, 0) / values.length;
}

export function cloneNormalization(value: AtlasNormalizationRecord): AtlasNormalizationRecord {
  return parseNormalization(serializeNormalization(value));
}

export function isTerminalNormalization(value: AtlasNormalizationRecord): boolean {
  return value.status === 'accepted' || value.status === 'rejected';
}

export function canSubmitNormalization(value: AtlasNormalizationRecord): boolean {
  return value.status === 'ready' && isValidNormalization(value) && value.id.length >= 3;
}

export function publicNormalizationView(value: AtlasNormalizationRecord): { id: string; status: NormalizationStatus; scoreBand: string } {
  return { id: value.id, status: value.status, scoreBand: gradeNormalization(value) };
}
export function NormalizationHasAny(value: AtlasNormalizationRecord, flags: readonly string[]): boolean {
  return flags.some((flag) => hasNormalizationFlag(value, flag));
}

export function NormalizationWithTags(value: AtlasNormalizationRecord, tags: readonly string[], now = Date.now()): AtlasNormalizationRecord {
  return { ...value, tags: uniqueNormalizationValues([...value.tags, ...tags]), updatedAt: Math.max(now, value.updatedAt) };
}

export function NormalizationWithMetadata(value: AtlasNormalizationRecord, metadata: Record<string, string>, now = Date.now()): AtlasNormalizationRecord {
  return { ...value, metadata: normalizeNormalizationMetadata({ ...value.metadata, ...metadata }), updatedAt: Math.max(now, value.updatedAt) };
}

export function NormalizationStatusLabel(value: AtlasNormalizationRecord): string {
  return value.status.replace(/^./, (character) => character.toUpperCase());
}

export function NormalizationNeedsReview(value: AtlasNormalizationRecord): boolean {
  return !isTerminalNormalization(value) && (hasNormalizationFlag(value, 'review') || value.score < 70);
}

export function NormalizationCanAdvance(value: AtlasNormalizationRecord): boolean {
  return !isTerminalNormalization(value) && (value.status !== 'submitted' || value.score >= 0);
}

export function NormalizationStableKey(value: AtlasNormalizationRecord): string {
  return `normalization:${value.id}:${checksumNormalization(value)}`;
}


