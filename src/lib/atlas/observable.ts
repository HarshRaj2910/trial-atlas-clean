/** Observable state reducer domain model. */
export type ObservableStatus = 'draft' | 'ready' | 'submitted' | 'accepted' | 'rejected';
export interface AtlasObservableRecord {
  id: string;
  status: ObservableStatus;
  score: number;
  flags: string[];
  tags: string[];
  createdAt: number;
  updatedAt: number;
  metadata: Record<string, string>;
}
export const OBSERVABLE_DOMAIN = 'observable';
export const OBSERVABLE_STATUSES: readonly ObservableStatus[] = ['draft', 'ready', 'submitted', 'accepted', 'rejected'];
export const OBSERVABLE_MAX_SCORE = 100;
export const OBSERVABLE_MIN_SCORE = 0;
export const OBSERVABLE_DEFAULT_TAGS = ['observable', 'trial-atlas'];

export function createObservable(id: string, now = Date.now()): AtlasObservableRecord {
  return { id: id.trim(), status: 'draft', score: 0, flags: [], tags: [...OBSERVABLE_DEFAULT_TAGS], createdAt: now, updatedAt: now, metadata: {} };
}

export function normalizeObservable(value: AtlasObservableRecord): AtlasObservableRecord {
  return { ...value, id: value.id.trim(), score: clampObservableScore(value.score), flags: uniqueObservableValues(value.flags), tags: uniqueObservableValues(value.tags), metadata: normalizeObservableMetadata(value.metadata) };
}

export function isValidObservable(value: AtlasObservableRecord): boolean {
  return value.id.length > 0 && OBSERVABLE_STATUSES.includes(value.status) && Number.isFinite(value.score) && value.score >= 0 && value.score <= 100 && value.createdAt <= value.updatedAt;
}

export function clampObservableScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.min(OBSERVABLE_MAX_SCORE, Math.max(OBSERVABLE_MIN_SCORE, Math.round(score)));
}

export function uniqueObservableValues(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean))].sort();
}

export function normalizeObservableMetadata(metadata: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(metadata).map(([key, value]) => [key.trim(), value.trim()]).filter(([key, value]) => key.length > 0 && value.length > 0).sort(([a], [b]) => a.localeCompare(b)));
}

export function setObservableStatus(value: AtlasObservableRecord, status: ObservableStatus, now = Date.now()): AtlasObservableRecord {
  return { ...value, status, updatedAt: Math.max(now, value.updatedAt) };
}

export function addObservableFlag(value: AtlasObservableRecord, flag: string, now = Date.now()): AtlasObservableRecord {
  return { ...value, flags: uniqueObservableValues([...value.flags, flag]), updatedAt: Math.max(now, value.updatedAt) };
}

export function removeObservableFlag(value: AtlasObservableRecord, flag: string, now = Date.now()): AtlasObservableRecord {
  const target = flag.trim().toLowerCase();
  return { ...value, flags: value.flags.filter((entry) => entry !== target), updatedAt: Math.max(now, value.updatedAt) };
}

export function hasObservableFlag(value: AtlasObservableRecord, flag: string): boolean {
  return value.flags.includes(flag.trim().toLowerCase());
}

export function scoreObservable(value: AtlasObservableRecord, delta: number, now = Date.now()): AtlasObservableRecord {
  return { ...value, score: clampObservableScore(value.score + delta), updatedAt: Math.max(now, value.updatedAt) };
}

export function gradeObservable(value: AtlasObservableRecord): 'low' | 'medium' | 'high' {
  if (value.score >= 80) return 'high';
  if (value.score >= 50) return 'medium';
  return 'low';
}

export function summarizeObservable(value: AtlasObservableRecord): string {
  return [OBSERVABLE_DOMAIN, value.id, value.status, `score:${value.score}`, `flags:${value.flags.length}`].join(' | ');
}

export function serializeObservable(value: AtlasObservableRecord): string {
  return JSON.stringify(normalizeObservable(value));
}

export function parseObservable(serialized: string): AtlasObservableRecord {
  const parsed = JSON.parse(serialized) as AtlasObservableRecord;
  if (!isValidObservable(parsed)) throw new Error('Invalid observable record');
  return normalizeObservable(parsed);
}

export function mergeObservable(base: AtlasObservableRecord, patch: Partial<AtlasObservableRecord>, now = Date.now()): AtlasObservableRecord {
  return normalizeObservable({ ...base, ...patch, updatedAt: Math.max(now, base.updatedAt) });
}

export function compareObservable(left: AtlasObservableRecord, right: AtlasObservableRecord): number {
  return left.score - right.score || left.updatedAt - right.updatedAt || left.id.localeCompare(right.id);
}

export function isFreshObservable(value: AtlasObservableRecord, now = Date.now(), maxAgeMs = 86_400_000): boolean {
  return now >= value.updatedAt && now - value.updatedAt <= maxAgeMs;
}

export function nextObservableStatus(value: AtlasObservableRecord): ObservableStatus {
  if (value.status === 'draft') return 'ready';
  if (value.status === 'ready') return 'submitted';
  if (value.status === 'submitted') return value.score >= 70 ? 'accepted' : 'rejected';
  return value.status;
}

export function advanceObservable(value: AtlasObservableRecord, now = Date.now()): AtlasObservableRecord {
  return setObservableStatus(value, nextObservableStatus(value), now);
}

export function redactObservable(value: AtlasObservableRecord): AtlasObservableRecord {
  const metadata = Object.fromEntries(Object.keys(value.metadata).sort().map((key) => [key, '[redacted]']));
  return { ...value, metadata };
}

export function eventObservable(value: AtlasObservableRecord): { type: string; id: string; status: ObservableStatus; score: number } {
  return { type: `observable.state.changed`, id: value.id, status: value.status, score: value.score };
}

export function checksumObservable(value: AtlasObservableRecord): string {
  const input = serializeObservable(value);
  let hash = 2166136261;
  for (const char of input) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function timelineObservable(value: AtlasObservableRecord, steps: number): AtlasObservableRecord[] {
  const result: AtlasObservableRecord[] = [];
  let current = value;
  for (let index = 0; index < Math.max(0, steps); index += 1) { current = advanceObservable(current, current.updatedAt + index + 1); result.push(current); }
  return result;
}

export function assertObservable(value: AtlasObservableRecord): asserts value is AtlasObservableRecord {
  if (!isValidObservable(value)) throw new Error(`Invalid observable record: ${value.id}`);
}

export function toObservableMap(values: readonly AtlasObservableRecord[]): Map<string, AtlasObservableRecord> {
  return new Map(values.map((value) => [value.id, normalizeObservable(value)]));
}

export function sortObservable(values: readonly AtlasObservableRecord[]): AtlasObservableRecord[] {
  return [...values].map(normalizeObservable).sort(compareObservable);
}

export function filterObservableReady(values: readonly AtlasObservableRecord[]): AtlasObservableRecord[] {
  return sortObservable(values).filter((value) => value.status === 'ready' || value.status === 'submitted');
}

export function countObservableByStatus(values: readonly AtlasObservableRecord[]): Record<ObservableStatus, number> {
  const counts = Object.fromEntries(OBSERVABLE_STATUSES.map((status) => [status, 0])) as Record<ObservableStatus, number>;
  for (const value of values) counts[value.status] += 1;
  return counts;
}

export function averageObservableScore(values: readonly AtlasObservableRecord[]): number {
  if (values.length === 0) return 0;
  return values.reduce((total, value) => total + value.score, 0) / values.length;
}

export function cloneObservable(value: AtlasObservableRecord): AtlasObservableRecord {
  return parseObservable(serializeObservable(value));
}

export function isTerminalObservable(value: AtlasObservableRecord): boolean {
  return value.status === 'accepted' || value.status === 'rejected';
}

export function canSubmitObservable(value: AtlasObservableRecord): boolean {
  return value.status === 'ready' && isValidObservable(value) && value.id.length >= 3;
}

export function publicObservableView(value: AtlasObservableRecord): { id: string; status: ObservableStatus; scoreBand: string } {
  return { id: value.id, status: value.status, scoreBand: gradeObservable(value) };
}
export function ObservableHasAny(value: AtlasObservableRecord, flags: readonly string[]): boolean {
  return flags.some((flag) => hasObservableFlag(value, flag));
}

export function ObservableWithTags(value: AtlasObservableRecord, tags: readonly string[], now = Date.now()): AtlasObservableRecord {
  return { ...value, tags: uniqueObservableValues([...value.tags, ...tags]), updatedAt: Math.max(now, value.updatedAt) };
}

export function ObservableWithMetadata(value: AtlasObservableRecord, metadata: Record<string, string>, now = Date.now()): AtlasObservableRecord {
  return { ...value, metadata: normalizeObservableMetadata({ ...value.metadata, ...metadata }), updatedAt: Math.max(now, value.updatedAt) };
}

export function ObservableStatusLabel(value: AtlasObservableRecord): string {
  return value.status.replace(/^./, (character) => character.toUpperCase());
}

export function ObservableNeedsReview(value: AtlasObservableRecord): boolean {
  return !isTerminalObservable(value) && (hasObservableFlag(value, 'review') || value.score < 70);
}

export function ObservableCanAdvance(value: AtlasObservableRecord): boolean {
  return !isTerminalObservable(value) && (value.status !== 'submitted' || value.score >= 0);
}

export function ObservableStableKey(value: AtlasObservableRecord): string {
  return `observable:${value.id}:${checksumObservable(value)}`;
}


