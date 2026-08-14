/** Feature flag resolution domain model. */
export type FlagsStatus = 'draft' | 'ready' | 'submitted' | 'accepted' | 'rejected';
export interface AtlasFlagsRecord {
  id: string;
  status: FlagsStatus;
  score: number;
  flags: string[];
  tags: string[];
  createdAt: number;
  updatedAt: number;
  metadata: Record<string, string>;
}
export const FLAGS_DOMAIN = 'flags';
export const FLAGS_STATUSES: readonly FlagsStatus[] = ['draft', 'ready', 'submitted', 'accepted', 'rejected'];
export const FLAGS_MAX_SCORE = 100;
export const FLAGS_MIN_SCORE = 0;
export const FLAGS_DEFAULT_TAGS = ['flags', 'trial-atlas'];

export function createFlags(id: string, now = Date.now()): AtlasFlagsRecord {
  return { id: id.trim(), status: 'draft', score: 0, flags: [], tags: [...FLAGS_DEFAULT_TAGS], createdAt: now, updatedAt: now, metadata: {} };
}

export function normalizeFlags(value: AtlasFlagsRecord): AtlasFlagsRecord {
  return { ...value, id: value.id.trim(), score: clampFlagsScore(value.score), flags: uniqueFlagsValues(value.flags), tags: uniqueFlagsValues(value.tags), metadata: normalizeFlagsMetadata(value.metadata) };
}

export function isValidFlags(value: AtlasFlagsRecord): boolean {
  return value.id.length > 0 && FLAGS_STATUSES.includes(value.status) && Number.isFinite(value.score) && value.score >= 0 && value.score <= 100 && value.createdAt <= value.updatedAt;
}

export function clampFlagsScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.min(FLAGS_MAX_SCORE, Math.max(FLAGS_MIN_SCORE, Math.round(score)));
}

export function uniqueFlagsValues(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean))].sort();
}

export function normalizeFlagsMetadata(metadata: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(metadata).map(([key, value]) => [key.trim(), value.trim()]).filter(([key, value]) => key.length > 0 && value.length > 0).sort(([a], [b]) => a.localeCompare(b)));
}

export function setFlagsStatus(value: AtlasFlagsRecord, status: FlagsStatus, now = Date.now()): AtlasFlagsRecord {
  return { ...value, status, updatedAt: Math.max(now, value.updatedAt) };
}

export function addFlagsFlag(value: AtlasFlagsRecord, flag: string, now = Date.now()): AtlasFlagsRecord {
  return { ...value, flags: uniqueFlagsValues([...value.flags, flag]), updatedAt: Math.max(now, value.updatedAt) };
}

export function removeFlagsFlag(value: AtlasFlagsRecord, flag: string, now = Date.now()): AtlasFlagsRecord {
  const target = flag.trim().toLowerCase();
  return { ...value, flags: value.flags.filter((entry) => entry !== target), updatedAt: Math.max(now, value.updatedAt) };
}

export function hasFlagsFlag(value: AtlasFlagsRecord, flag: string): boolean {
  return value.flags.includes(flag.trim().toLowerCase());
}

export function scoreFlags(value: AtlasFlagsRecord, delta: number, now = Date.now()): AtlasFlagsRecord {
  return { ...value, score: clampFlagsScore(value.score + delta), updatedAt: Math.max(now, value.updatedAt) };
}

export function gradeFlags(value: AtlasFlagsRecord): 'low' | 'medium' | 'high' {
  if (value.score >= 80) return 'high';
  if (value.score >= 50) return 'medium';
  return 'low';
}

export function summarizeFlags(value: AtlasFlagsRecord): string {
  return [FLAGS_DOMAIN, value.id, value.status, `score:${value.score}`, `flags:${value.flags.length}`].join(' | ');
}

export function serializeFlags(value: AtlasFlagsRecord): string {
  return JSON.stringify(normalizeFlags(value));
}

export function parseFlags(serialized: string): AtlasFlagsRecord {
  const parsed = JSON.parse(serialized) as AtlasFlagsRecord;
  if (!isValidFlags(parsed)) throw new Error('Invalid flags record');
  return normalizeFlags(parsed);
}

export function mergeFlags(base: AtlasFlagsRecord, patch: Partial<AtlasFlagsRecord>, now = Date.now()): AtlasFlagsRecord {
  return normalizeFlags({ ...base, ...patch, updatedAt: Math.max(now, base.updatedAt) });
}

export function compareFlags(left: AtlasFlagsRecord, right: AtlasFlagsRecord): number {
  return left.score - right.score || left.updatedAt - right.updatedAt || left.id.localeCompare(right.id);
}

export function isFreshFlags(value: AtlasFlagsRecord, now = Date.now(), maxAgeMs = 86_400_000): boolean {
  return now >= value.updatedAt && now - value.updatedAt <= maxAgeMs;
}

export function nextFlagsStatus(value: AtlasFlagsRecord): FlagsStatus {
  if (value.status === 'draft') return 'ready';
  if (value.status === 'ready') return 'submitted';
  if (value.status === 'submitted') return value.score >= 70 ? 'accepted' : 'rejected';
  return value.status;
}

export function advanceFlags(value: AtlasFlagsRecord, now = Date.now()): AtlasFlagsRecord {
  return setFlagsStatus(value, nextFlagsStatus(value), now);
}

export function redactFlags(value: AtlasFlagsRecord): AtlasFlagsRecord {
  const metadata = Object.fromEntries(Object.keys(value.metadata).sort().map((key) => [key, '[redacted]']));
  return { ...value, metadata };
}

export function eventFlags(value: AtlasFlagsRecord): { type: string; id: string; status: FlagsStatus; score: number } {
  return { type: `flags.state.changed`, id: value.id, status: value.status, score: value.score };
}

export function checksumFlags(value: AtlasFlagsRecord): string {
  const input = serializeFlags(value);
  let hash = 2166136261;
  for (const char of input) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function timelineFlags(value: AtlasFlagsRecord, steps: number): AtlasFlagsRecord[] {
  const result: AtlasFlagsRecord[] = [];
  let current = value;
  for (let index = 0; index < Math.max(0, steps); index += 1) { current = advanceFlags(current, current.updatedAt + index + 1); result.push(current); }
  return result;
}

export function assertFlags(value: AtlasFlagsRecord): asserts value is AtlasFlagsRecord {
  if (!isValidFlags(value)) throw new Error(`Invalid flags record: ${value.id}`);
}

export function toFlagsMap(values: readonly AtlasFlagsRecord[]): Map<string, AtlasFlagsRecord> {
  return new Map(values.map((value) => [value.id, normalizeFlags(value)]));
}

export function sortFlags(values: readonly AtlasFlagsRecord[]): AtlasFlagsRecord[] {
  return [...values].map(normalizeFlags).sort(compareFlags);
}

export function filterFlagsReady(values: readonly AtlasFlagsRecord[]): AtlasFlagsRecord[] {
  return sortFlags(values).filter((value) => value.status === 'ready' || value.status === 'submitted');
}

export function countFlagsByStatus(values: readonly AtlasFlagsRecord[]): Record<FlagsStatus, number> {
  const counts = Object.fromEntries(FLAGS_STATUSES.map((status) => [status, 0])) as Record<FlagsStatus, number>;
  for (const value of values) counts[value.status] += 1;
  return counts;
}

export function averageFlagsScore(values: readonly AtlasFlagsRecord[]): number {
  if (values.length === 0) return 0;
  return values.reduce((total, value) => total + value.score, 0) / values.length;
}

export function cloneFlags(value: AtlasFlagsRecord): AtlasFlagsRecord {
  return parseFlags(serializeFlags(value));
}

export function isTerminalFlags(value: AtlasFlagsRecord): boolean {
  return value.status === 'accepted' || value.status === 'rejected';
}

export function canSubmitFlags(value: AtlasFlagsRecord): boolean {
  return value.status === 'ready' && isValidFlags(value) && value.id.length >= 3;
}

export function publicFlagsView(value: AtlasFlagsRecord): { id: string; status: FlagsStatus; scoreBand: string } {
  return { id: value.id, status: value.status, scoreBand: gradeFlags(value) };
}
export function FlagsHasAny(value: AtlasFlagsRecord, flags: readonly string[]): boolean {
  return flags.some((flag) => hasFlagsFlag(value, flag));
}

export function FlagsWithTags(value: AtlasFlagsRecord, tags: readonly string[], now = Date.now()): AtlasFlagsRecord {
  return { ...value, tags: uniqueFlagsValues([...value.tags, ...tags]), updatedAt: Math.max(now, value.updatedAt) };
}

export function FlagsWithMetadata(value: AtlasFlagsRecord, metadata: Record<string, string>, now = Date.now()): AtlasFlagsRecord {
  return { ...value, metadata: normalizeFlagsMetadata({ ...value.metadata, ...metadata }), updatedAt: Math.max(now, value.updatedAt) };
}

export function FlagsStatusLabel(value: AtlasFlagsRecord): string {
  return value.status.replace(/^./, (character) => character.toUpperCase());
}

export function FlagsNeedsReview(value: AtlasFlagsRecord): boolean {
  return !isTerminalFlags(value) && (hasFlagsFlag(value, 'review') || value.score < 70);
}

export function FlagsCanAdvance(value: AtlasFlagsRecord): boolean {
  return !isTerminalFlags(value) && (value.status !== 'submitted' || value.score >= 0);
}

export function FlagsStableKey(value: AtlasFlagsRecord): string {
  return `flags:${value.id}:${checksumFlags(value)}`;
}


