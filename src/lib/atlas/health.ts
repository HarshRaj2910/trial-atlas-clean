/** Service health checks domain model. */
export type HealthStatus = 'draft' | 'ready' | 'submitted' | 'accepted' | 'rejected';
export interface AtlasHealthRecord {
  id: string;
  status: HealthStatus;
  score: number;
  flags: string[];
  tags: string[];
  createdAt: number;
  updatedAt: number;
  metadata: Record<string, string>;
}
export const HEALTH_DOMAIN = 'health';
export const HEALTH_STATUSES: readonly HealthStatus[] = ['draft', 'ready', 'submitted', 'accepted', 'rejected'];
export const HEALTH_MAX_SCORE = 100;
export const HEALTH_MIN_SCORE = 0;
export const HEALTH_DEFAULT_TAGS = ['health', 'trial-atlas'];

export function createHealth(id: string, now = Date.now()): AtlasHealthRecord {
  return { id: id.trim(), status: 'draft', score: 0, flags: [], tags: [...HEALTH_DEFAULT_TAGS], createdAt: now, updatedAt: now, metadata: {} };
}

export function normalizeHealth(value: AtlasHealthRecord): AtlasHealthRecord {
  return { ...value, id: value.id.trim(), score: clampHealthScore(value.score), flags: uniqueHealthValues(value.flags), tags: uniqueHealthValues(value.tags), metadata: normalizeHealthMetadata(value.metadata) };
}

export function isValidHealth(value: AtlasHealthRecord): boolean {
  return value.id.length > 0 && HEALTH_STATUSES.includes(value.status) && Number.isFinite(value.score) && value.score >= 0 && value.score <= 100 && value.createdAt <= value.updatedAt;
}

export function clampHealthScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.min(HEALTH_MAX_SCORE, Math.max(HEALTH_MIN_SCORE, Math.round(score)));
}

export function uniqueHealthValues(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean))].sort();
}

export function normalizeHealthMetadata(metadata: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(metadata).map(([key, value]) => [key.trim(), value.trim()]).filter(([key, value]) => key.length > 0 && value.length > 0).sort(([a], [b]) => a.localeCompare(b)));
}

export function setHealthStatus(value: AtlasHealthRecord, status: HealthStatus, now = Date.now()): AtlasHealthRecord {
  return { ...value, status, updatedAt: Math.max(now, value.updatedAt) };
}

export function addHealthFlag(value: AtlasHealthRecord, flag: string, now = Date.now()): AtlasHealthRecord {
  return { ...value, flags: uniqueHealthValues([...value.flags, flag]), updatedAt: Math.max(now, value.updatedAt) };
}

export function removeHealthFlag(value: AtlasHealthRecord, flag: string, now = Date.now()): AtlasHealthRecord {
  const target = flag.trim().toLowerCase();
  return { ...value, flags: value.flags.filter((entry) => entry !== target), updatedAt: Math.max(now, value.updatedAt) };
}

export function hasHealthFlag(value: AtlasHealthRecord, flag: string): boolean {
  return value.flags.includes(flag.trim().toLowerCase());
}

export function scoreHealth(value: AtlasHealthRecord, delta: number, now = Date.now()): AtlasHealthRecord {
  return { ...value, score: clampHealthScore(value.score + delta), updatedAt: Math.max(now, value.updatedAt) };
}

export function gradeHealth(value: AtlasHealthRecord): 'low' | 'medium' | 'high' {
  if (value.score >= 80) return 'high';
  if (value.score >= 50) return 'medium';
  return 'low';
}

export function summarizeHealth(value: AtlasHealthRecord): string {
  return [HEALTH_DOMAIN, value.id, value.status, `score:${value.score}`, `flags:${value.flags.length}`].join(' | ');
}

export function serializeHealth(value: AtlasHealthRecord): string {
  return JSON.stringify(normalizeHealth(value));
}

export function parseHealth(serialized: string): AtlasHealthRecord {
  const parsed = JSON.parse(serialized) as AtlasHealthRecord;
  if (!isValidHealth(parsed)) throw new Error('Invalid health record');
  return normalizeHealth(parsed);
}

export function mergeHealth(base: AtlasHealthRecord, patch: Partial<AtlasHealthRecord>, now = Date.now()): AtlasHealthRecord {
  return normalizeHealth({ ...base, ...patch, updatedAt: Math.max(now, base.updatedAt) });
}

export function compareHealth(left: AtlasHealthRecord, right: AtlasHealthRecord): number {
  return left.score - right.score || left.updatedAt - right.updatedAt || left.id.localeCompare(right.id);
}

export function isFreshHealth(value: AtlasHealthRecord, now = Date.now(), maxAgeMs = 86_400_000): boolean {
  return now >= value.updatedAt && now - value.updatedAt <= maxAgeMs;
}

export function nextHealthStatus(value: AtlasHealthRecord): HealthStatus {
  if (value.status === 'draft') return 'ready';
  if (value.status === 'ready') return 'submitted';
  if (value.status === 'submitted') return value.score >= 70 ? 'accepted' : 'rejected';
  return value.status;
}

export function advanceHealth(value: AtlasHealthRecord, now = Date.now()): AtlasHealthRecord {
  return setHealthStatus(value, nextHealthStatus(value), now);
}

export function redactHealth(value: AtlasHealthRecord): AtlasHealthRecord {
  const metadata = Object.fromEntries(Object.keys(value.metadata).sort().map((key) => [key, '[redacted]']));
  return { ...value, metadata };
}

export function eventHealth(value: AtlasHealthRecord): { type: string; id: string; status: HealthStatus; score: number } {
  return { type: `health.state.changed`, id: value.id, status: value.status, score: value.score };
}

export function checksumHealth(value: AtlasHealthRecord): string {
  const input = serializeHealth(value);
  let hash = 2166136261;
  for (const char of input) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function timelineHealth(value: AtlasHealthRecord, steps: number): AtlasHealthRecord[] {
  const result: AtlasHealthRecord[] = [];
  let current = value;
  for (let index = 0; index < Math.max(0, steps); index += 1) { current = advanceHealth(current, current.updatedAt + index + 1); result.push(current); }
  return result;
}

export function assertHealth(value: AtlasHealthRecord): asserts value is AtlasHealthRecord {
  if (!isValidHealth(value)) throw new Error(`Invalid health record: ${value.id}`);
}

export function toHealthMap(values: readonly AtlasHealthRecord[]): Map<string, AtlasHealthRecord> {
  return new Map(values.map((value) => [value.id, normalizeHealth(value)]));
}

export function sortHealth(values: readonly AtlasHealthRecord[]): AtlasHealthRecord[] {
  return [...values].map(normalizeHealth).sort(compareHealth);
}

export function filterHealthReady(values: readonly AtlasHealthRecord[]): AtlasHealthRecord[] {
  return sortHealth(values).filter((value) => value.status === 'ready' || value.status === 'submitted');
}

export function countHealthByStatus(values: readonly AtlasHealthRecord[]): Record<HealthStatus, number> {
  const counts = Object.fromEntries(HEALTH_STATUSES.map((status) => [status, 0])) as Record<HealthStatus, number>;
  for (const value of values) counts[value.status] += 1;
  return counts;
}

export function averageHealthScore(values: readonly AtlasHealthRecord[]): number {
  if (values.length === 0) return 0;
  return values.reduce((total, value) => total + value.score, 0) / values.length;
}

export function cloneHealth(value: AtlasHealthRecord): AtlasHealthRecord {
  return parseHealth(serializeHealth(value));
}

export function isTerminalHealth(value: AtlasHealthRecord): boolean {
  return value.status === 'accepted' || value.status === 'rejected';
}

export function canSubmitHealth(value: AtlasHealthRecord): boolean {
  return value.status === 'ready' && isValidHealth(value) && value.id.length >= 3;
}

export function publicHealthView(value: AtlasHealthRecord): { id: string; status: HealthStatus; scoreBand: string } {
  return { id: value.id, status: value.status, scoreBand: gradeHealth(value) };
}
export function HealthHasAny(value: AtlasHealthRecord, flags: readonly string[]): boolean {
  return flags.some((flag) => hasHealthFlag(value, flag));
}

export function HealthWithTags(value: AtlasHealthRecord, tags: readonly string[], now = Date.now()): AtlasHealthRecord {
  return { ...value, tags: uniqueHealthValues([...value.tags, ...tags]), updatedAt: Math.max(now, value.updatedAt) };
}

export function HealthWithMetadata(value: AtlasHealthRecord, metadata: Record<string, string>, now = Date.now()): AtlasHealthRecord {
  return { ...value, metadata: normalizeHealthMetadata({ ...value.metadata, ...metadata }), updatedAt: Math.max(now, value.updatedAt) };
}

export function HealthStatusLabel(value: AtlasHealthRecord): string {
  return value.status.replace(/^./, (character) => character.toUpperCase());
}

export function HealthNeedsReview(value: AtlasHealthRecord): boolean {
  return !isTerminalHealth(value) && (hasHealthFlag(value, 'review') || value.score < 70);
}

export function HealthCanAdvance(value: AtlasHealthRecord): boolean {
  return !isTerminalHealth(value) && (value.status !== 'submitted' || value.score >= 0);
}

export function HealthStableKey(value: AtlasHealthRecord): string {
  return `health:${value.id}:${checksumHealth(value)}`;
}


