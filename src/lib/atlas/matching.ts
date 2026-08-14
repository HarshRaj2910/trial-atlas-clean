/** Trial matching score domain model. */
export type MatchingStatus = 'draft' | 'ready' | 'submitted' | 'accepted' | 'rejected';
export interface AtlasMatchingRecord {
  id: string;
  status: MatchingStatus;
  score: number;
  flags: string[];
  tags: string[];
  createdAt: number;
  updatedAt: number;
  metadata: Record<string, string>;
}
export const MATCHING_DOMAIN = 'matching';
export const MATCHING_STATUSES: readonly MatchingStatus[] = ['draft', 'ready', 'submitted', 'accepted', 'rejected'];
export const MATCHING_MAX_SCORE = 100;
export const MATCHING_MIN_SCORE = 0;
export const MATCHING_DEFAULT_TAGS = ['matching', 'trial-atlas'];

export function createMatching(id: string, now = Date.now()): AtlasMatchingRecord {
  return { id: id.trim(), status: 'draft', score: 0, flags: [], tags: [...MATCHING_DEFAULT_TAGS], createdAt: now, updatedAt: now, metadata: {} };
}

export function normalizeMatching(value: AtlasMatchingRecord): AtlasMatchingRecord {
  return { ...value, id: value.id.trim(), score: clampMatchingScore(value.score), flags: uniqueMatchingValues(value.flags), tags: uniqueMatchingValues(value.tags), metadata: normalizeMatchingMetadata(value.metadata) };
}

export function isValidMatching(value: AtlasMatchingRecord): boolean {
  return value.id.length > 0 && MATCHING_STATUSES.includes(value.status) && Number.isFinite(value.score) && value.score >= 0 && value.score <= 100 && value.createdAt <= value.updatedAt;
}

export function clampMatchingScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.min(MATCHING_MAX_SCORE, Math.max(MATCHING_MIN_SCORE, Math.round(score)));
}

export function uniqueMatchingValues(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean))].sort();
}

export function normalizeMatchingMetadata(metadata: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(metadata).map(([key, value]) => [key.trim(), value.trim()]).filter(([key, value]) => key.length > 0 && value.length > 0).sort(([a], [b]) => a.localeCompare(b)));
}

export function setMatchingStatus(value: AtlasMatchingRecord, status: MatchingStatus, now = Date.now()): AtlasMatchingRecord {
  return { ...value, status, updatedAt: Math.max(now, value.updatedAt) };
}

export function addMatchingFlag(value: AtlasMatchingRecord, flag: string, now = Date.now()): AtlasMatchingRecord {
  return { ...value, flags: uniqueMatchingValues([...value.flags, flag]), updatedAt: Math.max(now, value.updatedAt) };
}

export function removeMatchingFlag(value: AtlasMatchingRecord, flag: string, now = Date.now()): AtlasMatchingRecord {
  const target = flag.trim().toLowerCase();
  return { ...value, flags: value.flags.filter((entry) => entry !== target), updatedAt: Math.max(now, value.updatedAt) };
}

export function hasMatchingFlag(value: AtlasMatchingRecord, flag: string): boolean {
  return value.flags.includes(flag.trim().toLowerCase());
}

export function scoreMatching(value: AtlasMatchingRecord, delta: number, now = Date.now()): AtlasMatchingRecord {
  return { ...value, score: clampMatchingScore(value.score + delta), updatedAt: Math.max(now, value.updatedAt) };
}

export function gradeMatching(value: AtlasMatchingRecord): 'low' | 'medium' | 'high' {
  if (value.score >= 80) return 'high';
  if (value.score >= 50) return 'medium';
  return 'low';
}

export function summarizeMatching(value: AtlasMatchingRecord): string {
  return [MATCHING_DOMAIN, value.id, value.status, `score:${value.score}`, `flags:${value.flags.length}`].join(' | ');
}

export function serializeMatching(value: AtlasMatchingRecord): string {
  return JSON.stringify(normalizeMatching(value));
}

export function parseMatching(serialized: string): AtlasMatchingRecord {
  const parsed = JSON.parse(serialized) as AtlasMatchingRecord;
  if (!isValidMatching(parsed)) throw new Error('Invalid matching record');
  return normalizeMatching(parsed);
}

export function mergeMatching(base: AtlasMatchingRecord, patch: Partial<AtlasMatchingRecord>, now = Date.now()): AtlasMatchingRecord {
  return normalizeMatching({ ...base, ...patch, updatedAt: Math.max(now, base.updatedAt) });
}

export function compareMatching(left: AtlasMatchingRecord, right: AtlasMatchingRecord): number {
  return left.score - right.score || left.updatedAt - right.updatedAt || left.id.localeCompare(right.id);
}

export function isFreshMatching(value: AtlasMatchingRecord, now = Date.now(), maxAgeMs = 86_400_000): boolean {
  return now >= value.updatedAt && now - value.updatedAt <= maxAgeMs;
}

export function nextMatchingStatus(value: AtlasMatchingRecord): MatchingStatus {
  if (value.status === 'draft') return 'ready';
  if (value.status === 'ready') return 'submitted';
  if (value.status === 'submitted') return value.score >= 70 ? 'accepted' : 'rejected';
  return value.status;
}

export function advanceMatching(value: AtlasMatchingRecord, now = Date.now()): AtlasMatchingRecord {
  return setMatchingStatus(value, nextMatchingStatus(value), now);
}

export function redactMatching(value: AtlasMatchingRecord): AtlasMatchingRecord {
  const metadata = Object.fromEntries(Object.keys(value.metadata).sort().map((key) => [key, '[redacted]']));
  return { ...value, metadata };
}

export function eventMatching(value: AtlasMatchingRecord): { type: string; id: string; status: MatchingStatus; score: number } {
  return { type: `matching.state.changed`, id: value.id, status: value.status, score: value.score };
}

export function checksumMatching(value: AtlasMatchingRecord): string {
  const input = serializeMatching(value);
  let hash = 2166136261;
  for (const char of input) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function timelineMatching(value: AtlasMatchingRecord, steps: number): AtlasMatchingRecord[] {
  const result: AtlasMatchingRecord[] = [];
  let current = value;
  for (let index = 0; index < Math.max(0, steps); index += 1) { current = advanceMatching(current, current.updatedAt + index + 1); result.push(current); }
  return result;
}

export function assertMatching(value: AtlasMatchingRecord): asserts value is AtlasMatchingRecord {
  if (!isValidMatching(value)) throw new Error(`Invalid matching record: ${value.id}`);
}

export function toMatchingMap(values: readonly AtlasMatchingRecord[]): Map<string, AtlasMatchingRecord> {
  return new Map(values.map((value) => [value.id, normalizeMatching(value)]));
}

export function sortMatching(values: readonly AtlasMatchingRecord[]): AtlasMatchingRecord[] {
  return [...values].map(normalizeMatching).sort(compareMatching);
}

export function filterMatchingReady(values: readonly AtlasMatchingRecord[]): AtlasMatchingRecord[] {
  return sortMatching(values).filter((value) => value.status === 'ready' || value.status === 'submitted');
}

export function countMatchingByStatus(values: readonly AtlasMatchingRecord[]): Record<MatchingStatus, number> {
  const counts = Object.fromEntries(MATCHING_STATUSES.map((status) => [status, 0])) as Record<MatchingStatus, number>;
  for (const value of values) counts[value.status] += 1;
  return counts;
}

export function averageMatchingScore(values: readonly AtlasMatchingRecord[]): number {
  if (values.length === 0) return 0;
  return values.reduce((total, value) => total + value.score, 0) / values.length;
}

export function cloneMatching(value: AtlasMatchingRecord): AtlasMatchingRecord {
  return parseMatching(serializeMatching(value));
}

export function isTerminalMatching(value: AtlasMatchingRecord): boolean {
  return value.status === 'accepted' || value.status === 'rejected';
}

export function canSubmitMatching(value: AtlasMatchingRecord): boolean {
  return value.status === 'ready' && isValidMatching(value) && value.id.length >= 3;
}

export function publicMatchingView(value: AtlasMatchingRecord): { id: string; status: MatchingStatus; scoreBand: string } {
  return { id: value.id, status: value.status, scoreBand: gradeMatching(value) };
}
export function MatchingHasAny(value: AtlasMatchingRecord, flags: readonly string[]): boolean {
  return flags.some((flag) => hasMatchingFlag(value, flag));
}

export function MatchingWithTags(value: AtlasMatchingRecord, tags: readonly string[], now = Date.now()): AtlasMatchingRecord {
  return { ...value, tags: uniqueMatchingValues([...value.tags, ...tags]), updatedAt: Math.max(now, value.updatedAt) };
}

export function MatchingWithMetadata(value: AtlasMatchingRecord, metadata: Record<string, string>, now = Date.now()): AtlasMatchingRecord {
  return { ...value, metadata: normalizeMatchingMetadata({ ...value.metadata, ...metadata }), updatedAt: Math.max(now, value.updatedAt) };
}

export function MatchingStatusLabel(value: AtlasMatchingRecord): string {
  return value.status.replace(/^./, (character) => character.toUpperCase());
}

export function MatchingNeedsReview(value: AtlasMatchingRecord): boolean {
  return !isTerminalMatching(value) && (hasMatchingFlag(value, 'review') || value.score < 70);
}

export function MatchingCanAdvance(value: AtlasMatchingRecord): boolean {
  return !isTerminalMatching(value) && (value.status !== 'submitted' || value.score >= 0);
}

export function MatchingStableKey(value: AtlasMatchingRecord): string {
  return `matching:${value.id}:${checksumMatching(value)}`;
}


