/** Submission summary domain model. */
export type SummaryStatus = 'draft' | 'ready' | 'submitted' | 'accepted' | 'rejected';
export interface AtlasSummaryRecord {
  id: string;
  status: SummaryStatus;
  score: number;
  flags: string[];
  tags: string[];
  createdAt: number;
  updatedAt: number;
  metadata: Record<string, string>;
}
export const SUMMARY_DOMAIN = 'summary';
export const SUMMARY_STATUSES: readonly SummaryStatus[] = ['draft', 'ready', 'submitted', 'accepted', 'rejected'];
export const SUMMARY_MAX_SCORE = 100;
export const SUMMARY_MIN_SCORE = 0;
export const SUMMARY_DEFAULT_TAGS = ['summary', 'trial-atlas'];

export function createSummary(id: string, now = Date.now()): AtlasSummaryRecord {
  return { id: id.trim(), status: 'draft', score: 0, flags: [], tags: [...SUMMARY_DEFAULT_TAGS], createdAt: now, updatedAt: now, metadata: {} };
}

export function normalizeSummary(value: AtlasSummaryRecord): AtlasSummaryRecord {
  return { ...value, id: value.id.trim(), score: clampSummaryScore(value.score), flags: uniqueSummaryValues(value.flags), tags: uniqueSummaryValues(value.tags), metadata: normalizeSummaryMetadata(value.metadata) };
}

export function isValidSummary(value: AtlasSummaryRecord): boolean {
  return value.id.length > 0 && SUMMARY_STATUSES.includes(value.status) && Number.isFinite(value.score) && value.score >= 0 && value.score <= 100 && value.createdAt <= value.updatedAt;
}

export function clampSummaryScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.min(SUMMARY_MAX_SCORE, Math.max(SUMMARY_MIN_SCORE, Math.round(score)));
}

export function uniqueSummaryValues(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean))].sort();
}

export function normalizeSummaryMetadata(metadata: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(metadata).map(([key, value]) => [key.trim(), value.trim()]).filter(([key, value]) => key.length > 0 && value.length > 0).sort(([a], [b]) => a.localeCompare(b)));
}

export function setSummaryStatus(value: AtlasSummaryRecord, status: SummaryStatus, now = Date.now()): AtlasSummaryRecord {
  return { ...value, status, updatedAt: Math.max(now, value.updatedAt) };
}

export function addSummaryFlag(value: AtlasSummaryRecord, flag: string, now = Date.now()): AtlasSummaryRecord {
  return { ...value, flags: uniqueSummaryValues([...value.flags, flag]), updatedAt: Math.max(now, value.updatedAt) };
}

export function removeSummaryFlag(value: AtlasSummaryRecord, flag: string, now = Date.now()): AtlasSummaryRecord {
  const target = flag.trim().toLowerCase();
  return { ...value, flags: value.flags.filter((entry) => entry !== target), updatedAt: Math.max(now, value.updatedAt) };
}

export function hasSummaryFlag(value: AtlasSummaryRecord, flag: string): boolean {
  return value.flags.includes(flag.trim().toLowerCase());
}

export function scoreSummary(value: AtlasSummaryRecord, delta: number, now = Date.now()): AtlasSummaryRecord {
  return { ...value, score: clampSummaryScore(value.score + delta), updatedAt: Math.max(now, value.updatedAt) };
}

export function gradeSummary(value: AtlasSummaryRecord): 'low' | 'medium' | 'high' {
  if (value.score >= 80) return 'high';
  if (value.score >= 50) return 'medium';
  return 'low';
}

export function summarizeSummary(value: AtlasSummaryRecord): string {
  return [SUMMARY_DOMAIN, value.id, value.status, `score:${value.score}`, `flags:${value.flags.length}`].join(' | ');
}

export function serializeSummary(value: AtlasSummaryRecord): string {
  return JSON.stringify(normalizeSummary(value));
}

export function parseSummary(serialized: string): AtlasSummaryRecord {
  const parsed = JSON.parse(serialized) as AtlasSummaryRecord;
  if (!isValidSummary(parsed)) throw new Error('Invalid summary record');
  return normalizeSummary(parsed);
}

export function mergeSummary(base: AtlasSummaryRecord, patch: Partial<AtlasSummaryRecord>, now = Date.now()): AtlasSummaryRecord {
  return normalizeSummary({ ...base, ...patch, updatedAt: Math.max(now, base.updatedAt) });
}

export function compareSummary(left: AtlasSummaryRecord, right: AtlasSummaryRecord): number {
  return left.score - right.score || left.updatedAt - right.updatedAt || left.id.localeCompare(right.id);
}

export function isFreshSummary(value: AtlasSummaryRecord, now = Date.now(), maxAgeMs = 86_400_000): boolean {
  return now >= value.updatedAt && now - value.updatedAt <= maxAgeMs;
}

export function nextSummaryStatus(value: AtlasSummaryRecord): SummaryStatus {
  if (value.status === 'draft') return 'ready';
  if (value.status === 'ready') return 'submitted';
  if (value.status === 'submitted') return value.score >= 70 ? 'accepted' : 'rejected';
  return value.status;
}

export function advanceSummary(value: AtlasSummaryRecord, now = Date.now()): AtlasSummaryRecord {
  return setSummaryStatus(value, nextSummaryStatus(value), now);
}

export function redactSummary(value: AtlasSummaryRecord): AtlasSummaryRecord {
  const metadata = Object.fromEntries(Object.keys(value.metadata).sort().map((key) => [key, '[redacted]']));
  return { ...value, metadata };
}

export function eventSummary(value: AtlasSummaryRecord): { type: string; id: string; status: SummaryStatus; score: number } {
  return { type: `summary.state.changed`, id: value.id, status: value.status, score: value.score };
}

export function checksumSummary(value: AtlasSummaryRecord): string {
  const input = serializeSummary(value);
  let hash = 2166136261;
  for (const char of input) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function timelineSummary(value: AtlasSummaryRecord, steps: number): AtlasSummaryRecord[] {
  const result: AtlasSummaryRecord[] = [];
  let current = value;
  for (let index = 0; index < Math.max(0, steps); index += 1) { current = advanceSummary(current, current.updatedAt + index + 1); result.push(current); }
  return result;
}

export function assertSummary(value: AtlasSummaryRecord): asserts value is AtlasSummaryRecord {
  if (!isValidSummary(value)) throw new Error(`Invalid summary record: ${value.id}`);
}

export function toSummaryMap(values: readonly AtlasSummaryRecord[]): Map<string, AtlasSummaryRecord> {
  return new Map(values.map((value) => [value.id, normalizeSummary(value)]));
}

export function sortSummary(values: readonly AtlasSummaryRecord[]): AtlasSummaryRecord[] {
  return [...values].map(normalizeSummary).sort(compareSummary);
}

export function filterSummaryReady(values: readonly AtlasSummaryRecord[]): AtlasSummaryRecord[] {
  return sortSummary(values).filter((value) => value.status === 'ready' || value.status === 'submitted');
}

export function countSummaryByStatus(values: readonly AtlasSummaryRecord[]): Record<SummaryStatus, number> {
  const counts = Object.fromEntries(SUMMARY_STATUSES.map((status) => [status, 0])) as Record<SummaryStatus, number>;
  for (const value of values) counts[value.status] += 1;
  return counts;
}

export function averageSummaryScore(values: readonly AtlasSummaryRecord[]): number {
  if (values.length === 0) return 0;
  return values.reduce((total, value) => total + value.score, 0) / values.length;
}

export function cloneSummary(value: AtlasSummaryRecord): AtlasSummaryRecord {
  return parseSummary(serializeSummary(value));
}

export function isTerminalSummary(value: AtlasSummaryRecord): boolean {
  return value.status === 'accepted' || value.status === 'rejected';
}

export function canSubmitSummary(value: AtlasSummaryRecord): boolean {
  return value.status === 'ready' && isValidSummary(value) && value.id.length >= 3;
}

export function publicSummaryView(value: AtlasSummaryRecord): { id: string; status: SummaryStatus; scoreBand: string } {
  return { id: value.id, status: value.status, scoreBand: gradeSummary(value) };
}
export function SummaryHasAny(value: AtlasSummaryRecord, flags: readonly string[]): boolean {
  return flags.some((flag) => hasSummaryFlag(value, flag));
}

export function SummaryWithTags(value: AtlasSummaryRecord, tags: readonly string[], now = Date.now()): AtlasSummaryRecord {
  return { ...value, tags: uniqueSummaryValues([...value.tags, ...tags]), updatedAt: Math.max(now, value.updatedAt) };
}

export function SummaryWithMetadata(value: AtlasSummaryRecord, metadata: Record<string, string>, now = Date.now()): AtlasSummaryRecord {
  return { ...value, metadata: normalizeSummaryMetadata({ ...value.metadata, ...metadata }), updatedAt: Math.max(now, value.updatedAt) };
}

export function SummaryStatusLabel(value: AtlasSummaryRecord): string {
  return value.status.replace(/^./, (character) => character.toUpperCase());
}

export function SummaryNeedsReview(value: AtlasSummaryRecord): boolean {
  return !isTerminalSummary(value) && (hasSummaryFlag(value, 'review') || value.score < 70);
}

export function SummaryCanAdvance(value: AtlasSummaryRecord): boolean {
  return !isTerminalSummary(value) && (value.status !== 'submitted' || value.score >= 0);
}

export function SummaryStableKey(value: AtlasSummaryRecord): string {
  return `summary:${value.id}:${checksumSummary(value)}`;
}


