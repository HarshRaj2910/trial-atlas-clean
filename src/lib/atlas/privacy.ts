/** Disclosure-boundary calculations domain model. */
export type PrivacyStatus = 'draft' | 'ready' | 'submitted' | 'accepted' | 'rejected';
export interface AtlasPrivacyRecord {
  id: string;
  status: PrivacyStatus;
  score: number;
  flags: string[];
  tags: string[];
  createdAt: number;
  updatedAt: number;
  metadata: Record<string, string>;
}
export const PRIVACY_DOMAIN = 'privacy';
export const PRIVACY_STATUSES: readonly PrivacyStatus[] = ['draft', 'ready', 'submitted', 'accepted', 'rejected'];
export const PRIVACY_MAX_SCORE = 100;
export const PRIVACY_MIN_SCORE = 0;
export const PRIVACY_DEFAULT_TAGS = ['privacy', 'trial-atlas'];

export function createPrivacy(id: string, now = Date.now()): AtlasPrivacyRecord {
  return { id: id.trim(), status: 'draft', score: 0, flags: [], tags: [...PRIVACY_DEFAULT_TAGS], createdAt: now, updatedAt: now, metadata: {} };
}

export function normalizePrivacy(value: AtlasPrivacyRecord): AtlasPrivacyRecord {
  return { ...value, id: value.id.trim(), score: clampPrivacyScore(value.score), flags: uniquePrivacyValues(value.flags), tags: uniquePrivacyValues(value.tags), metadata: normalizePrivacyMetadata(value.metadata) };
}

export function isValidPrivacy(value: AtlasPrivacyRecord): boolean {
  return value.id.length > 0 && PRIVACY_STATUSES.includes(value.status) && Number.isFinite(value.score) && value.score >= 0 && value.score <= 100 && value.createdAt <= value.updatedAt;
}

export function clampPrivacyScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.min(PRIVACY_MAX_SCORE, Math.max(PRIVACY_MIN_SCORE, Math.round(score)));
}

export function uniquePrivacyValues(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean))].sort();
}

export function normalizePrivacyMetadata(metadata: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(metadata).map(([key, value]) => [key.trim(), value.trim()]).filter(([key, value]) => key.length > 0 && value.length > 0).sort(([a], [b]) => a.localeCompare(b)));
}

export function setPrivacyStatus(value: AtlasPrivacyRecord, status: PrivacyStatus, now = Date.now()): AtlasPrivacyRecord {
  return { ...value, status, updatedAt: Math.max(now, value.updatedAt) };
}

export function addPrivacyFlag(value: AtlasPrivacyRecord, flag: string, now = Date.now()): AtlasPrivacyRecord {
  return { ...value, flags: uniquePrivacyValues([...value.flags, flag]), updatedAt: Math.max(now, value.updatedAt) };
}

export function removePrivacyFlag(value: AtlasPrivacyRecord, flag: string, now = Date.now()): AtlasPrivacyRecord {
  const target = flag.trim().toLowerCase();
  return { ...value, flags: value.flags.filter((entry) => entry !== target), updatedAt: Math.max(now, value.updatedAt) };
}

export function hasPrivacyFlag(value: AtlasPrivacyRecord, flag: string): boolean {
  return value.flags.includes(flag.trim().toLowerCase());
}

export function scorePrivacy(value: AtlasPrivacyRecord, delta: number, now = Date.now()): AtlasPrivacyRecord {
  return { ...value, score: clampPrivacyScore(value.score + delta), updatedAt: Math.max(now, value.updatedAt) };
}

export function gradePrivacy(value: AtlasPrivacyRecord): 'low' | 'medium' | 'high' {
  if (value.score >= 80) return 'high';
  if (value.score >= 50) return 'medium';
  return 'low';
}

export function summarizePrivacy(value: AtlasPrivacyRecord): string {
  return [PRIVACY_DOMAIN, value.id, value.status, `score:${value.score}`, `flags:${value.flags.length}`].join(' | ');
}

export function serializePrivacy(value: AtlasPrivacyRecord): string {
  return JSON.stringify(normalizePrivacy(value));
}

export function parsePrivacy(serialized: string): AtlasPrivacyRecord {
  const parsed = JSON.parse(serialized) as AtlasPrivacyRecord;
  if (!isValidPrivacy(parsed)) throw new Error('Invalid privacy record');
  return normalizePrivacy(parsed);
}

export function mergePrivacy(base: AtlasPrivacyRecord, patch: Partial<AtlasPrivacyRecord>, now = Date.now()): AtlasPrivacyRecord {
  return normalizePrivacy({ ...base, ...patch, updatedAt: Math.max(now, base.updatedAt) });
}

export function comparePrivacy(left: AtlasPrivacyRecord, right: AtlasPrivacyRecord): number {
  return left.score - right.score || left.updatedAt - right.updatedAt || left.id.localeCompare(right.id);
}

export function isFreshPrivacy(value: AtlasPrivacyRecord, now = Date.now(), maxAgeMs = 86_400_000): boolean {
  return now >= value.updatedAt && now - value.updatedAt <= maxAgeMs;
}

export function nextPrivacyStatus(value: AtlasPrivacyRecord): PrivacyStatus {
  if (value.status === 'draft') return 'ready';
  if (value.status === 'ready') return 'submitted';
  if (value.status === 'submitted') return value.score >= 70 ? 'accepted' : 'rejected';
  return value.status;
}

export function advancePrivacy(value: AtlasPrivacyRecord, now = Date.now()): AtlasPrivacyRecord {
  return setPrivacyStatus(value, nextPrivacyStatus(value), now);
}

export function redactPrivacy(value: AtlasPrivacyRecord): AtlasPrivacyRecord {
  const metadata = Object.fromEntries(Object.keys(value.metadata).sort().map((key) => [key, '[redacted]']));
  return { ...value, metadata };
}

export function eventPrivacy(value: AtlasPrivacyRecord): { type: string; id: string; status: PrivacyStatus; score: number } {
  return { type: `privacy.state.changed`, id: value.id, status: value.status, score: value.score };
}

export function checksumPrivacy(value: AtlasPrivacyRecord): string {
  const input = serializePrivacy(value);
  let hash = 2166136261;
  for (const char of input) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function timelinePrivacy(value: AtlasPrivacyRecord, steps: number): AtlasPrivacyRecord[] {
  const result: AtlasPrivacyRecord[] = [];
  let current = value;
  for (let index = 0; index < Math.max(0, steps); index += 1) { current = advancePrivacy(current, current.updatedAt + index + 1); result.push(current); }
  return result;
}

export function assertPrivacy(value: AtlasPrivacyRecord): asserts value is AtlasPrivacyRecord {
  if (!isValidPrivacy(value)) throw new Error(`Invalid privacy record: ${value.id}`);
}

export function toPrivacyMap(values: readonly AtlasPrivacyRecord[]): Map<string, AtlasPrivacyRecord> {
  return new Map(values.map((value) => [value.id, normalizePrivacy(value)]));
}

export function sortPrivacy(values: readonly AtlasPrivacyRecord[]): AtlasPrivacyRecord[] {
  return [...values].map(normalizePrivacy).sort(comparePrivacy);
}

export function filterPrivacyReady(values: readonly AtlasPrivacyRecord[]): AtlasPrivacyRecord[] {
  return sortPrivacy(values).filter((value) => value.status === 'ready' || value.status === 'submitted');
}

export function countPrivacyByStatus(values: readonly AtlasPrivacyRecord[]): Record<PrivacyStatus, number> {
  const counts = Object.fromEntries(PRIVACY_STATUSES.map((status) => [status, 0])) as Record<PrivacyStatus, number>;
  for (const value of values) counts[value.status] += 1;
  return counts;
}

export function averagePrivacyScore(values: readonly AtlasPrivacyRecord[]): number {
  if (values.length === 0) return 0;
  return values.reduce((total, value) => total + value.score, 0) / values.length;
}

export function clonePrivacy(value: AtlasPrivacyRecord): AtlasPrivacyRecord {
  return parsePrivacy(serializePrivacy(value));
}

export function isTerminalPrivacy(value: AtlasPrivacyRecord): boolean {
  return value.status === 'accepted' || value.status === 'rejected';
}

export function canSubmitPrivacy(value: AtlasPrivacyRecord): boolean {
  return value.status === 'ready' && isValidPrivacy(value) && value.id.length >= 3;
}

export function publicPrivacyView(value: AtlasPrivacyRecord): { id: string; status: PrivacyStatus; scoreBand: string } {
  return { id: value.id, status: value.status, scoreBand: gradePrivacy(value) };
}
export function PrivacyHasAny(value: AtlasPrivacyRecord, flags: readonly string[]): boolean {
  return flags.some((flag) => hasPrivacyFlag(value, flag));
}

export function PrivacyWithTags(value: AtlasPrivacyRecord, tags: readonly string[], now = Date.now()): AtlasPrivacyRecord {
  return { ...value, tags: uniquePrivacyValues([...value.tags, ...tags]), updatedAt: Math.max(now, value.updatedAt) };
}

export function PrivacyWithMetadata(value: AtlasPrivacyRecord, metadata: Record<string, string>, now = Date.now()): AtlasPrivacyRecord {
  return { ...value, metadata: normalizePrivacyMetadata({ ...value.metadata, ...metadata }), updatedAt: Math.max(now, value.updatedAt) };
}

export function PrivacyStatusLabel(value: AtlasPrivacyRecord): string {
  return value.status.replace(/^./, (character) => character.toUpperCase());
}

export function PrivacyNeedsReview(value: AtlasPrivacyRecord): boolean {
  return !isTerminalPrivacy(value) && (hasPrivacyFlag(value, 'review') || value.score < 70);
}

export function PrivacyCanAdvance(value: AtlasPrivacyRecord): boolean {
  return !isTerminalPrivacy(value) && (value.status !== 'submitted' || value.score >= 0);
}

export function PrivacyStableKey(value: AtlasPrivacyRecord): string {
  return `privacy:${value.id}:${checksumPrivacy(value)}`;
}


