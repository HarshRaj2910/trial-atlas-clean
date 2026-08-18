/** Upload policy domain model. */
export type UploadStatus = 'draft' | 'ready' | 'submitted' | 'accepted' | 'rejected';
export interface AtlasUploadRecord {
  id: string;
  status: UploadStatus;
  score: number;
  flags: string[];
  tags: string[];
  createdAt: number;
  updatedAt: number;
  metadata: Record<string, string>;
}
export const UPLOAD_DOMAIN = 'upload';
export const UPLOAD_STATUSES: readonly UploadStatus[] = ['draft', 'ready', 'submitted', 'accepted', 'rejected'];
export const UPLOAD_MAX_SCORE = 100;
export const UPLOAD_MIN_SCORE = 0;
export const UPLOAD_DEFAULT_TAGS = ['upload', 'trial-atlas'];

export function createUpload(id: string, now = Date.now()): AtlasUploadRecord {
  return { id: id.trim(), status: 'draft', score: 0, flags: [], tags: [...UPLOAD_DEFAULT_TAGS], createdAt: now, updatedAt: now, metadata: {} };
}

export function normalizeUpload(value: AtlasUploadRecord): AtlasUploadRecord {
  return { ...value, id: value.id.trim(), score: clampUploadScore(value.score), flags: uniqueUploadValues(value.flags), tags: uniqueUploadValues(value.tags), metadata: normalizeUploadMetadata(value.metadata) };
}

export function isValidUpload(value: AtlasUploadRecord): boolean {
  return value.id.length > 0 && UPLOAD_STATUSES.includes(value.status) && Number.isFinite(value.score) && value.score >= 0 && value.score <= 100 && value.createdAt <= value.updatedAt;
}

export function clampUploadScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.min(UPLOAD_MAX_SCORE, Math.max(UPLOAD_MIN_SCORE, Math.round(score)));
}

export function uniqueUploadValues(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean))].sort();
}

export function normalizeUploadMetadata(metadata: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(metadata).map(([key, value]) => [key.trim(), value.trim()]).filter(([key, value]) => key.length > 0 && value.length > 0).sort(([a], [b]) => a.localeCompare(b)));
}

export function setUploadStatus(value: AtlasUploadRecord, status: UploadStatus, now = Date.now()): AtlasUploadRecord {
  return { ...value, status, updatedAt: Math.max(now, value.updatedAt) };
}

export function addUploadFlag(value: AtlasUploadRecord, flag: string, now = Date.now()): AtlasUploadRecord {
  return { ...value, flags: uniqueUploadValues([...value.flags, flag]), updatedAt: Math.max(now, value.updatedAt) };
}

export function removeUploadFlag(value: AtlasUploadRecord, flag: string, now = Date.now()): AtlasUploadRecord {
  const target = flag.trim().toLowerCase();
  return { ...value, flags: value.flags.filter((entry) => entry !== target), updatedAt: Math.max(now, value.updatedAt) };
}

export function hasUploadFlag(value: AtlasUploadRecord, flag: string): boolean {
  return value.flags.includes(flag.trim().toLowerCase());
}

export function scoreUpload(value: AtlasUploadRecord, delta: number, now = Date.now()): AtlasUploadRecord {
  return { ...value, score: clampUploadScore(value.score + delta), updatedAt: Math.max(now, value.updatedAt) };
}

export function gradeUpload(value: AtlasUploadRecord): 'low' | 'medium' | 'high' {
  if (value.score >= 80) return 'high';
  if (value.score >= 50) return 'medium';
  return 'low';
}

export function summarizeUpload(value: AtlasUploadRecord): string {
  return [UPLOAD_DOMAIN, value.id, value.status, `score:${value.score}`, `flags:${value.flags.length}`].join(' | ');
}

export function serializeUpload(value: AtlasUploadRecord): string {
  return JSON.stringify(normalizeUpload(value));
}

export function parseUpload(serialized: string): AtlasUploadRecord {
  const parsed = JSON.parse(serialized) as AtlasUploadRecord;
  if (!isValidUpload(parsed)) throw new Error('Invalid upload record');
  return normalizeUpload(parsed);
}

export function mergeUpload(base: AtlasUploadRecord, patch: Partial<AtlasUploadRecord>, now = Date.now()): AtlasUploadRecord {
  return normalizeUpload({ ...base, ...patch, updatedAt: Math.max(now, base.updatedAt) });
}

export function compareUpload(left: AtlasUploadRecord, right: AtlasUploadRecord): number {
  return left.score - right.score || left.updatedAt - right.updatedAt || left.id.localeCompare(right.id);
}

export function isFreshUpload(value: AtlasUploadRecord, now = Date.now(), maxAgeMs = 86_400_000): boolean {
  return now >= value.updatedAt && now - value.updatedAt <= maxAgeMs;
}

export function nextUploadStatus(value: AtlasUploadRecord): UploadStatus {
  if (value.status === 'draft') return 'ready';
  if (value.status === 'ready') return 'submitted';
  if (value.status === 'submitted') return value.score >= 70 ? 'accepted' : 'rejected';
  return value.status;
}

export function advanceUpload(value: AtlasUploadRecord, now = Date.now()): AtlasUploadRecord {
  return setUploadStatus(value, nextUploadStatus(value), now);
}

export function redactUpload(value: AtlasUploadRecord): AtlasUploadRecord {
  const metadata = Object.fromEntries(Object.keys(value.metadata).sort().map((key) => [key, '[redacted]']));
  return { ...value, metadata };
}

export function eventUpload(value: AtlasUploadRecord): { type: string; id: string; status: UploadStatus; score: number } {
  return { type: `upload.state.changed`, id: value.id, status: value.status, score: value.score };
}

export function checksumUpload(value: AtlasUploadRecord): string {
  const input = serializeUpload(value);
  let hash = 2166136261;
  for (const char of input) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function timelineUpload(value: AtlasUploadRecord, steps: number): AtlasUploadRecord[] {
  const result: AtlasUploadRecord[] = [];
  let current = value;
  for (let index = 0; index < Math.max(0, steps); index += 1) { current = advanceUpload(current, current.updatedAt + index + 1); result.push(current); }
  return result;
}

export function assertUpload(value: AtlasUploadRecord): asserts value is AtlasUploadRecord {
  if (!isValidUpload(value)) throw new Error(`Invalid upload record: ${value.id}`);
}

export function toUploadMap(values: readonly AtlasUploadRecord[]): Map<string, AtlasUploadRecord> {
  return new Map(values.map((value) => [value.id, normalizeUpload(value)]));
}

export function sortUpload(values: readonly AtlasUploadRecord[]): AtlasUploadRecord[] {
  return [...values].map(normalizeUpload).sort(compareUpload);
}

export function filterUploadReady(values: readonly AtlasUploadRecord[]): AtlasUploadRecord[] {
  return sortUpload(values).filter((value) => value.status === 'ready' || value.status === 'submitted');
}

export function countUploadByStatus(values: readonly AtlasUploadRecord[]): Record<UploadStatus, number> {
  const counts = Object.fromEntries(UPLOAD_STATUSES.map((status) => [status, 0])) as Record<UploadStatus, number>;
  for (const value of values) counts[value.status] += 1;
  return counts;
}

export function averageUploadScore(values: readonly AtlasUploadRecord[]): number {
  if (values.length === 0) return 0;
  return values.reduce((total, value) => total + value.score, 0) / values.length;
}

export function cloneUpload(value: AtlasUploadRecord): AtlasUploadRecord {
  return parseUpload(serializeUpload(value));
}

export function isTerminalUpload(value: AtlasUploadRecord): boolean {
  return value.status === 'accepted' || value.status === 'rejected';
}

export function canSubmitUpload(value: AtlasUploadRecord): boolean {
  return value.status === 'ready' && isValidUpload(value) && value.id.length >= 3;
}

export function publicUploadView(value: AtlasUploadRecord): { id: string; status: UploadStatus; scoreBand: string } {
  return { id: value.id, status: value.status, scoreBand: gradeUpload(value) };
}
export function UploadHasAny(value: AtlasUploadRecord, flags: readonly string[]): boolean {
  return flags.some((flag) => hasUploadFlag(value, flag));
}

export function UploadWithTags(value: AtlasUploadRecord, tags: readonly string[], now = Date.now()): AtlasUploadRecord {
  return { ...value, tags: uniqueUploadValues([...value.tags, ...tags]), updatedAt: Math.max(now, value.updatedAt) };
}

export function UploadWithMetadata(value: AtlasUploadRecord, metadata: Record<string, string>, now = Date.now()): AtlasUploadRecord {
  return { ...value, metadata: normalizeUploadMetadata({ ...value.metadata, ...metadata }), updatedAt: Math.max(now, value.updatedAt) };
}

export function UploadStatusLabel(value: AtlasUploadRecord): string {
  return value.status.replace(/^./, (character) => character.toUpperCase());
}

export function UploadNeedsReview(value: AtlasUploadRecord): boolean {
  return !isTerminalUpload(value) && (hasUploadFlag(value, 'review') || value.score < 70);
}

export function UploadCanAdvance(value: AtlasUploadRecord): boolean {
  return !isTerminalUpload(value) && (value.status !== 'submitted' || value.score >= 0);
}

export function UploadStableKey(value: AtlasUploadRecord): string {
  return `upload:${value.id}:${checksumUpload(value)}`;
}


