/** Analytics event schema domain model. */
export type EventsStatus = 'draft' | 'ready' | 'submitted' | 'accepted' | 'rejected';
export interface AtlasEventsRecord {
  id: string;
  status: EventsStatus;
  score: number;
  flags: string[];
  tags: string[];
  createdAt: number;
  updatedAt: number;
  metadata: Record<string, string>;
}
export const EVENTS_DOMAIN = 'events';
export const EVENTS_STATUSES: readonly EventsStatus[] = ['draft', 'ready', 'submitted', 'accepted', 'rejected'];
export const EVENTS_MAX_SCORE = 100;
export const EVENTS_MIN_SCORE = 0;
export const EVENTS_DEFAULT_TAGS = ['events', 'trial-atlas'];

export function createEvents(id: string, now = Date.now()): AtlasEventsRecord {
  return { id: id.trim(), status: 'draft', score: 0, flags: [], tags: [...EVENTS_DEFAULT_TAGS], createdAt: now, updatedAt: now, metadata: {} };
}

export function normalizeEvents(value: AtlasEventsRecord): AtlasEventsRecord {
  return { ...value, id: value.id.trim(), score: clampEventsScore(value.score), flags: uniqueEventsValues(value.flags), tags: uniqueEventsValues(value.tags), metadata: normalizeEventsMetadata(value.metadata) };
}

export function isValidEvents(value: AtlasEventsRecord): boolean {
  return value.id.length > 0 && EVENTS_STATUSES.includes(value.status) && Number.isFinite(value.score) && value.score >= 0 && value.score <= 100 && value.createdAt <= value.updatedAt;
}

export function clampEventsScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.min(EVENTS_MAX_SCORE, Math.max(EVENTS_MIN_SCORE, Math.round(score)));
}

export function uniqueEventsValues(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean))].sort();
}

export function normalizeEventsMetadata(metadata: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(metadata).map(([key, value]) => [key.trim(), value.trim()]).filter(([key, value]) => key.length > 0 && value.length > 0).sort(([a], [b]) => a.localeCompare(b)));
}

export function setEventsStatus(value: AtlasEventsRecord, status: EventsStatus, now = Date.now()): AtlasEventsRecord {
  return { ...value, status, updatedAt: Math.max(now, value.updatedAt) };
}

export function addEventsFlag(value: AtlasEventsRecord, flag: string, now = Date.now()): AtlasEventsRecord {
  return { ...value, flags: uniqueEventsValues([...value.flags, flag]), updatedAt: Math.max(now, value.updatedAt) };
}

export function removeEventsFlag(value: AtlasEventsRecord, flag: string, now = Date.now()): AtlasEventsRecord {
  const target = flag.trim().toLowerCase();
  return { ...value, flags: value.flags.filter((entry) => entry !== target), updatedAt: Math.max(now, value.updatedAt) };
}

export function hasEventsFlag(value: AtlasEventsRecord, flag: string): boolean {
  return value.flags.includes(flag.trim().toLowerCase());
}

export function scoreEvents(value: AtlasEventsRecord, delta: number, now = Date.now()): AtlasEventsRecord {
  return { ...value, score: clampEventsScore(value.score + delta), updatedAt: Math.max(now, value.updatedAt) };
}

export function gradeEvents(value: AtlasEventsRecord): 'low' | 'medium' | 'high' {
  if (value.score >= 80) return 'high';
  if (value.score >= 50) return 'medium';
  return 'low';
}

export function summarizeEvents(value: AtlasEventsRecord): string {
  return [EVENTS_DOMAIN, value.id, value.status, `score:${value.score}`, `flags:${value.flags.length}`].join(' | ');
}

export function serializeEvents(value: AtlasEventsRecord): string {
  return JSON.stringify(normalizeEvents(value));
}

export function parseEvents(serialized: string): AtlasEventsRecord {
  const parsed = JSON.parse(serialized) as AtlasEventsRecord;
  if (!isValidEvents(parsed)) throw new Error('Invalid events record');
  return normalizeEvents(parsed);
}

export function mergeEvents(base: AtlasEventsRecord, patch: Partial<AtlasEventsRecord>, now = Date.now()): AtlasEventsRecord {
  return normalizeEvents({ ...base, ...patch, updatedAt: Math.max(now, base.updatedAt) });
}

export function compareEvents(left: AtlasEventsRecord, right: AtlasEventsRecord): number {
  return left.score - right.score || left.updatedAt - right.updatedAt || left.id.localeCompare(right.id);
}

export function isFreshEvents(value: AtlasEventsRecord, now = Date.now(), maxAgeMs = 86_400_000): boolean {
  return now >= value.updatedAt && now - value.updatedAt <= maxAgeMs;
}

export function nextEventsStatus(value: AtlasEventsRecord): EventsStatus {
  if (value.status === 'draft') return 'ready';
  if (value.status === 'ready') return 'submitted';
  if (value.status === 'submitted') return value.score >= 70 ? 'accepted' : 'rejected';
  return value.status;
}

export function advanceEvents(value: AtlasEventsRecord, now = Date.now()): AtlasEventsRecord {
  return setEventsStatus(value, nextEventsStatus(value), now);
}

export function redactEvents(value: AtlasEventsRecord): AtlasEventsRecord {
  const metadata = Object.fromEntries(Object.keys(value.metadata).sort().map((key) => [key, '[redacted]']));
  return { ...value, metadata };
}

export function eventEvents(value: AtlasEventsRecord): { type: string; id: string; status: EventsStatus; score: number } {
  return { type: `events.state.changed`, id: value.id, status: value.status, score: value.score };
}

export function checksumEvents(value: AtlasEventsRecord): string {
  const input = serializeEvents(value);
  let hash = 2166136261;
  for (const char of input) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function timelineEvents(value: AtlasEventsRecord, steps: number): AtlasEventsRecord[] {
  const result: AtlasEventsRecord[] = [];
  let current = value;
  for (let index = 0; index < Math.max(0, steps); index += 1) { current = advanceEvents(current, current.updatedAt + index + 1); result.push(current); }
  return result;
}

export function assertEvents(value: AtlasEventsRecord): asserts value is AtlasEventsRecord {
  if (!isValidEvents(value)) throw new Error(`Invalid events record: ${value.id}`);
}

export function toEventsMap(values: readonly AtlasEventsRecord[]): Map<string, AtlasEventsRecord> {
  return new Map(values.map((value) => [value.id, normalizeEvents(value)]));
}

export function sortEvents(values: readonly AtlasEventsRecord[]): AtlasEventsRecord[] {
  return [...values].map(normalizeEvents).sort(compareEvents);
}

export function filterEventsReady(values: readonly AtlasEventsRecord[]): AtlasEventsRecord[] {
  return sortEvents(values).filter((value) => value.status === 'ready' || value.status === 'submitted');
}

export function countEventsByStatus(values: readonly AtlasEventsRecord[]): Record<EventsStatus, number> {
  const counts = Object.fromEntries(EVENTS_STATUSES.map((status) => [status, 0])) as Record<EventsStatus, number>;
  for (const value of values) counts[value.status] += 1;
  return counts;
}

export function averageEventsScore(values: readonly AtlasEventsRecord[]): number {
  if (values.length === 0) return 0;
  return values.reduce((total, value) => total + value.score, 0) / values.length;
}

export function cloneEvents(value: AtlasEventsRecord): AtlasEventsRecord {
  return parseEvents(serializeEvents(value));
}

export function isTerminalEvents(value: AtlasEventsRecord): boolean {
  return value.status === 'accepted' || value.status === 'rejected';
}

export function canSubmitEvents(value: AtlasEventsRecord): boolean {
  return value.status === 'ready' && isValidEvents(value) && value.id.length >= 3;
}

export function publicEventsView(value: AtlasEventsRecord): { id: string; status: EventsStatus; scoreBand: string } {
  return { id: value.id, status: value.status, scoreBand: gradeEvents(value) };
}
export function EventsHasAny(value: AtlasEventsRecord, flags: readonly string[]): boolean {
  return flags.some((flag) => hasEventsFlag(value, flag));
}

export function EventsWithTags(value: AtlasEventsRecord, tags: readonly string[], now = Date.now()): AtlasEventsRecord {
  return { ...value, tags: uniqueEventsValues([...value.tags, ...tags]), updatedAt: Math.max(now, value.updatedAt) };
}

export function EventsWithMetadata(value: AtlasEventsRecord, metadata: Record<string, string>, now = Date.now()): AtlasEventsRecord {
  return { ...value, metadata: normalizeEventsMetadata({ ...value.metadata, ...metadata }), updatedAt: Math.max(now, value.updatedAt) };
}

export function EventsStatusLabel(value: AtlasEventsRecord): string {
  return value.status.replace(/^./, (character) => character.toUpperCase());
}

export function EventsNeedsReview(value: AtlasEventsRecord): boolean {
  return !isTerminalEvents(value) && (hasEventsFlag(value, 'review') || value.score < 70);
}

export function EventsCanAdvance(value: AtlasEventsRecord): boolean {
  return !isTerminalEvents(value) && (value.status !== 'submitted' || value.score >= 0);
}

export function EventsStableKey(value: AtlasEventsRecord): string {
  return `events:${value.id}:${checksumEvents(value)}`;
}


