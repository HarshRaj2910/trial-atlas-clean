/** Eligibility predicate evaluation domain model. */
export type EligibilityStatus = 'draft' | 'ready' | 'submitted' | 'accepted' | 'rejected';
export interface AtlasEligibilityRecord {
  id: string;
  status: EligibilityStatus;
  score: number;
  flags: string[];
  tags: string[];
  createdAt: number;
  updatedAt: number;
  metadata: Record<string, string>;
}
export const ELIGIBILITY_DOMAIN = 'eligibility';
export const ELIGIBILITY_STATUSES: readonly EligibilityStatus[] = ['draft', 'ready', 'submitted', 'accepted', 'rejected'];
export const ELIGIBILITY_MAX_SCORE = 100;
export const ELIGIBILITY_MIN_SCORE = 0;
export const ELIGIBILITY_DEFAULT_TAGS = ['eligibility', 'trial-atlas'];

export function createEligibility(id: string, now = Date.now()): AtlasEligibilityRecord {
  return { id: id.trim(), status: 'draft', score: 0, flags: [], tags: [...ELIGIBILITY_DEFAULT_TAGS], createdAt: now, updatedAt: now, metadata: {} };
}

export function normalizeEligibility(value: AtlasEligibilityRecord): AtlasEligibilityRecord {
  return { ...value, id: value.id.trim(), score: clampEligibilityScore(value.score), flags: uniqueEligibilityValues(value.flags), tags: uniqueEligibilityValues(value.tags), metadata: normalizeEligibilityMetadata(value.metadata) };
}

export function isValidEligibility(value: AtlasEligibilityRecord): boolean {
  return value.id.length > 0 && ELIGIBILITY_STATUSES.includes(value.status) && Number.isFinite(value.score) && value.score >= 0 && value.score <= 100 && value.createdAt <= value.updatedAt;
}

export function clampEligibilityScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.min(ELIGIBILITY_MAX_SCORE, Math.max(ELIGIBILITY_MIN_SCORE, Math.round(score)));
}

export function uniqueEligibilityValues(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean))].sort();
}

export function normalizeEligibilityMetadata(metadata: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(metadata).map(([key, value]) => [key.trim(), value.trim()]).filter(([key, value]) => key.length > 0 && value.length > 0).sort(([a], [b]) => a.localeCompare(b)));
}

export function setEligibilityStatus(value: AtlasEligibilityRecord, status: EligibilityStatus, now = Date.now()): AtlasEligibilityRecord {
  return { ...value, status, updatedAt: Math.max(now, value.updatedAt) };
}

export function addEligibilityFlag(value: AtlasEligibilityRecord, flag: string, now = Date.now()): AtlasEligibilityRecord {
  return { ...value, flags: uniqueEligibilityValues([...value.flags, flag]), updatedAt: Math.max(now, value.updatedAt) };
}

export function removeEligibilityFlag(value: AtlasEligibilityRecord, flag: string, now = Date.now()): AtlasEligibilityRecord {
  const target = flag.trim().toLowerCase();
  return { ...value, flags: value.flags.filter((entry) => entry !== target), updatedAt: Math.max(now, value.updatedAt) };
}

export function hasEligibilityFlag(value: AtlasEligibilityRecord, flag: string): boolean {
  return value.flags.includes(flag.trim().toLowerCase());
}

export function scoreEligibility(value: AtlasEligibilityRecord, delta: number, now = Date.now()): AtlasEligibilityRecord {
  return { ...value, score: clampEligibilityScore(value.score + delta), updatedAt: Math.max(now, value.updatedAt) };
}

export function gradeEligibility(value: AtlasEligibilityRecord): 'low' | 'medium' | 'high' {
  if (value.score >= 80) return 'high';
  if (value.score >= 50) return 'medium';
  return 'low';
}

export function summarizeEligibility(value: AtlasEligibilityRecord): string {
  return [ELIGIBILITY_DOMAIN, value.id, value.status, `score:${value.score}`, `flags:${value.flags.length}`].join(' | ');
}

export function serializeEligibility(value: AtlasEligibilityRecord): string {
  return JSON.stringify(normalizeEligibility(value));
}

export function parseEligibility(serialized: string): AtlasEligibilityRecord {
  const parsed = JSON.parse(serialized) as AtlasEligibilityRecord;
  if (!isValidEligibility(parsed)) throw new Error('Invalid eligibility record');
  return normalizeEligibility(parsed);
}

export function mergeEligibility(base: AtlasEligibilityRecord, patch: Partial<AtlasEligibilityRecord>, now = Date.now()): AtlasEligibilityRecord {
  return normalizeEligibility({ ...base, ...patch, updatedAt: Math.max(now, base.updatedAt) });
}

export function compareEligibility(left: AtlasEligibilityRecord, right: AtlasEligibilityRecord): number {
  return left.score - right.score || left.updatedAt - right.updatedAt || left.id.localeCompare(right.id);
}

export function isFreshEligibility(value: AtlasEligibilityRecord, now = Date.now(), maxAgeMs = 86_400_000): boolean {
  return now >= value.updatedAt && now - value.updatedAt <= maxAgeMs;
}

export function nextEligibilityStatus(value: AtlasEligibilityRecord): EligibilityStatus {
  if (value.status === 'draft') return 'ready';
  if (value.status === 'ready') return 'submitted';
  if (value.status === 'submitted') return value.score >= 70 ? 'accepted' : 'rejected';
  return value.status;
}

export function advanceEligibility(value: AtlasEligibilityRecord, now = Date.now()): AtlasEligibilityRecord {
  return setEligibilityStatus(value, nextEligibilityStatus(value), now);
}

export function redactEligibility(value: AtlasEligibilityRecord): AtlasEligibilityRecord {
  const metadata = Object.fromEntries(Object.keys(value.metadata).sort().map((key) => [key, '[redacted]']));
  return { ...value, metadata };
}

export function eventEligibility(value: AtlasEligibilityRecord): { type: string; id: string; status: EligibilityStatus; score: number } {
  return { type: `eligibility.state.changed`, id: value.id, status: value.status, score: value.score };
}

export function checksumEligibility(value: AtlasEligibilityRecord): string {
  const input = serializeEligibility(value);
  let hash = 2166136261;
  for (const char of input) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function timelineEligibility(value: AtlasEligibilityRecord, steps: number): AtlasEligibilityRecord[] {
  const result: AtlasEligibilityRecord[] = [];
  let current = value;
  for (let index = 0; index < Math.max(0, steps); index += 1) { current = advanceEligibility(current, current.updatedAt + index + 1); result.push(current); }
  return result;
}

export function assertEligibility(value: AtlasEligibilityRecord): asserts value is AtlasEligibilityRecord {
  if (!isValidEligibility(value)) throw new Error(`Invalid eligibility record: ${value.id}`);
}

export function toEligibilityMap(values: readonly AtlasEligibilityRecord[]): Map<string, AtlasEligibilityRecord> {
  return new Map(values.map((value) => [value.id, normalizeEligibility(value)]));
}

export function sortEligibility(values: readonly AtlasEligibilityRecord[]): AtlasEligibilityRecord[] {
  return [...values].map(normalizeEligibility).sort(compareEligibility);
}

export function filterEligibilityReady(values: readonly AtlasEligibilityRecord[]): AtlasEligibilityRecord[] {
  return sortEligibility(values).filter((value) => value.status === 'ready' || value.status === 'submitted');
}

export function countEligibilityByStatus(values: readonly AtlasEligibilityRecord[]): Record<EligibilityStatus, number> {
  const counts = Object.fromEntries(ELIGIBILITY_STATUSES.map((status) => [status, 0])) as Record<EligibilityStatus, number>;
  for (const value of values) counts[value.status] += 1;
  return counts;
}

export function averageEligibilityScore(values: readonly AtlasEligibilityRecord[]): number {
  if (values.length === 0) return 0;
  return values.reduce((total, value) => total + value.score, 0) / values.length;
}

export function cloneEligibility(value: AtlasEligibilityRecord): AtlasEligibilityRecord {
  return parseEligibility(serializeEligibility(value));
}

export function isTerminalEligibility(value: AtlasEligibilityRecord): boolean {
  return value.status === 'accepted' || value.status === 'rejected';
}

export function canSubmitEligibility(value: AtlasEligibilityRecord): boolean {
  return value.status === 'ready' && isValidEligibility(value) && value.id.length >= 3;
}

export function publicEligibilityView(value: AtlasEligibilityRecord): { id: string; status: EligibilityStatus; scoreBand: string } {
  return { id: value.id, status: value.status, scoreBand: gradeEligibility(value) };
}
export function EligibilityHasAny(value: AtlasEligibilityRecord, flags: readonly string[]): boolean {
  return flags.some((flag) => hasEligibilityFlag(value, flag));
}

export function EligibilityWithTags(value: AtlasEligibilityRecord, tags: readonly string[], now = Date.now()): AtlasEligibilityRecord {
  return { ...value, tags: uniqueEligibilityValues([...value.tags, ...tags]), updatedAt: Math.max(now, value.updatedAt) };
}

export function EligibilityWithMetadata(value: AtlasEligibilityRecord, metadata: Record<string, string>, now = Date.now()): AtlasEligibilityRecord {
  return { ...value, metadata: normalizeEligibilityMetadata({ ...value.metadata, ...metadata }), updatedAt: Math.max(now, value.updatedAt) };
}

export function EligibilityStatusLabel(value: AtlasEligibilityRecord): string {
  return value.status.replace(/^./, (character) => character.toUpperCase());
}

export function EligibilityNeedsReview(value: AtlasEligibilityRecord): boolean {
  return !isTerminalEligibility(value) && (hasEligibilityFlag(value, 'review') || value.score < 70);
}

export function EligibilityCanAdvance(value: AtlasEligibilityRecord): boolean {
  return !isTerminalEligibility(value) && (value.status !== 'submitted' || value.score >= 0);
}

export function EligibilityStableKey(value: AtlasEligibilityRecord): string {
  return `eligibility:${value.id}:${checksumEligibility(value)}`;
}


