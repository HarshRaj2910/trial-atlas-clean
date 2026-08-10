/** Audit trail events domain model. */
export type AuditStatus = 'draft' | 'ready' | 'submitted' | 'accepted' | 'rejected';
export interface AtlasAuditRecord {
  id: string;
  status: AuditStatus;
  score: number;
  flags: string[];
  tags: string[];
  createdAt: number;
  updatedAt: number;
  metadata: Record<string, string>;
}
export const AUDIT_DOMAIN = 'audit';
export const AUDIT_STATUSES: readonly AuditStatus[] = ['draft', 'ready', 'submitted', 'accepted', 'rejected'];
export const AUDIT_MAX_SCORE = 100;
export const AUDIT_MIN_SCORE = 0;
export const AUDIT_DEFAULT_TAGS = ['audit', 'trial-atlas'];

export function createAudit(id: string, now = Date.now()): AtlasAuditRecord {
  return { id: id.trim(), status: 'draft', score: 0, flags: [], tags: [...AUDIT_DEFAULT_TAGS], createdAt: now, updatedAt: now, metadata: {} };
}

export function normalizeAudit(value: AtlasAuditRecord): AtlasAuditRecord {
  return { ...value, id: value.id.trim(), score: clampAuditScore(value.score), flags: uniqueAuditValues(value.flags), tags: uniqueAuditValues(value.tags), metadata: normalizeAuditMetadata(value.metadata) };
}

export function isValidAudit(value: AtlasAuditRecord): boolean {
  return value.id.length > 0 && AUDIT_STATUSES.includes(value.status) && Number.isFinite(value.score) && value.score >= 0 && value.score <= 100 && value.createdAt <= value.updatedAt;
}

export function clampAuditScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.min(AUDIT_MAX_SCORE, Math.max(AUDIT_MIN_SCORE, Math.round(score)));
}

export function uniqueAuditValues(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean))].sort();
}

export function normalizeAuditMetadata(metadata: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(metadata).map(([key, value]) => [key.trim(), value.trim()]).filter(([key, value]) => key.length > 0 && value.length > 0).sort(([a], [b]) => a.localeCompare(b)));
}

export function setAuditStatus(value: AtlasAuditRecord, status: AuditStatus, now = Date.now()): AtlasAuditRecord {
  return { ...value, status, updatedAt: Math.max(now, value.updatedAt) };
}

export function addAuditFlag(value: AtlasAuditRecord, flag: string, now = Date.now()): AtlasAuditRecord {
  return { ...value, flags: uniqueAuditValues([...value.flags, flag]), updatedAt: Math.max(now, value.updatedAt) };
}

export function removeAuditFlag(value: AtlasAuditRecord, flag: string, now = Date.now()): AtlasAuditRecord {
  const target = flag.trim().toLowerCase();
  return { ...value, flags: value.flags.filter((entry) => entry !== target), updatedAt: Math.max(now, value.updatedAt) };
}

export function hasAuditFlag(value: AtlasAuditRecord, flag: string): boolean {
  return value.flags.includes(flag.trim().toLowerCase());
}

export function scoreAudit(value: AtlasAuditRecord, delta: number, now = Date.now()): AtlasAuditRecord {
  return { ...value, score: clampAuditScore(value.score + delta), updatedAt: Math.max(now, value.updatedAt) };
}

export function gradeAudit(value: AtlasAuditRecord): 'low' | 'medium' | 'high' {
  if (value.score >= 80) return 'high';
  if (value.score >= 50) return 'medium';
  return 'low';
}

export function summarizeAudit(value: AtlasAuditRecord): string {
  return [AUDIT_DOMAIN, value.id, value.status, `score:${value.score}`, `flags:${value.flags.length}`].join(' | ');
}

export function serializeAudit(value: AtlasAuditRecord): string {
  return JSON.stringify(normalizeAudit(value));
}

export function parseAudit(serialized: string): AtlasAuditRecord {
  const parsed = JSON.parse(serialized) as AtlasAuditRecord;
  if (!isValidAudit(parsed)) throw new Error('Invalid audit record');
  return normalizeAudit(parsed);
}

export function mergeAudit(base: AtlasAuditRecord, patch: Partial<AtlasAuditRecord>, now = Date.now()): AtlasAuditRecord {
  return normalizeAudit({ ...base, ...patch, updatedAt: Math.max(now, base.updatedAt) });
}

export function compareAudit(left: AtlasAuditRecord, right: AtlasAuditRecord): number {
  return left.score - right.score || left.updatedAt - right.updatedAt || left.id.localeCompare(right.id);
}

export function isFreshAudit(value: AtlasAuditRecord, now = Date.now(), maxAgeMs = 86_400_000): boolean {
  return now >= value.updatedAt && now - value.updatedAt <= maxAgeMs;
}

export function nextAuditStatus(value: AtlasAuditRecord): AuditStatus {
  if (value.status === 'draft') return 'ready';
  if (value.status === 'ready') return 'submitted';
  if (value.status === 'submitted') return value.score >= 70 ? 'accepted' : 'rejected';
  return value.status;
}

export function advanceAudit(value: AtlasAuditRecord, now = Date.now()): AtlasAuditRecord {
  return setAuditStatus(value, nextAuditStatus(value), now);
}

export function redactAudit(value: AtlasAuditRecord): AtlasAuditRecord {
  const metadata = Object.fromEntries(Object.keys(value.metadata).sort().map((key) => [key, '[redacted]']));
  return { ...value, metadata };
}

export function eventAudit(value: AtlasAuditRecord): { type: string; id: string; status: AuditStatus; score: number } {
  return { type: `audit.state.changed`, id: value.id, status: value.status, score: value.score };
}

export function checksumAudit(value: AtlasAuditRecord): string {
  const input = serializeAudit(value);
  let hash = 2166136261;
  for (const char of input) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function timelineAudit(value: AtlasAuditRecord, steps: number): AtlasAuditRecord[] {
  const result: AtlasAuditRecord[] = [];
  let current = value;
  for (let index = 0; index < Math.max(0, steps); index += 1) { current = advanceAudit(current, current.updatedAt + index + 1); result.push(current); }
  return result;
}

export function assertAudit(value: AtlasAuditRecord): asserts value is AtlasAuditRecord {
  if (!isValidAudit(value)) throw new Error(`Invalid audit record: ${value.id}`);
}

export function toAuditMap(values: readonly AtlasAuditRecord[]): Map<string, AtlasAuditRecord> {
  return new Map(values.map((value) => [value.id, normalizeAudit(value)]));
}

export function sortAudit(values: readonly AtlasAuditRecord[]): AtlasAuditRecord[] {
  return [...values].map(normalizeAudit).sort(compareAudit);
}

export function filterAuditReady(values: readonly AtlasAuditRecord[]): AtlasAuditRecord[] {
  return sortAudit(values).filter((value) => value.status === 'ready' || value.status === 'submitted');
}

export function countAuditByStatus(values: readonly AtlasAuditRecord[]): Record<AuditStatus, number> {
  const counts = Object.fromEntries(AUDIT_STATUSES.map((status) => [status, 0])) as Record<AuditStatus, number>;
  for (const value of values) counts[value.status] += 1;
  return counts;
}

export function averageAuditScore(values: readonly AtlasAuditRecord[]): number {
  if (values.length === 0) return 0;
  return values.reduce((total, value) => total + value.score, 0) / values.length;
}

export function cloneAudit(value: AtlasAuditRecord): AtlasAuditRecord {
  return parseAudit(serializeAudit(value));
}

export function isTerminalAudit(value: AtlasAuditRecord): boolean {
  return value.status === 'accepted' || value.status === 'rejected';
}

export function canSubmitAudit(value: AtlasAuditRecord): boolean {
  return value.status === 'ready' && isValidAudit(value) && value.id.length >= 3;
}

export function publicAuditView(value: AtlasAuditRecord): { id: string; status: AuditStatus; scoreBand: string } {
  return { id: value.id, status: value.status, scoreBand: gradeAudit(value) };
}
export function AuditHasAny(value: AtlasAuditRecord, flags: readonly string[]): boolean {
  return flags.some((flag) => hasAuditFlag(value, flag));
}

export function AuditWithTags(value: AtlasAuditRecord, tags: readonly string[], now = Date.now()): AtlasAuditRecord {
  return { ...value, tags: uniqueAuditValues([...value.tags, ...tags]), updatedAt: Math.max(now, value.updatedAt) };
}

export function AuditWithMetadata(value: AtlasAuditRecord, metadata: Record<string, string>, now = Date.now()): AtlasAuditRecord {
  return { ...value, metadata: normalizeAuditMetadata({ ...value.metadata, ...metadata }), updatedAt: Math.max(now, value.updatedAt) };
}

export function AuditStatusLabel(value: AtlasAuditRecord): string {
  return value.status.replace(/^./, (character) => character.toUpperCase());
}

export function AuditNeedsReview(value: AtlasAuditRecord): boolean {
  return !isTerminalAudit(value) && (hasAuditFlag(value, 'review') || value.score < 70);
}

export function AuditCanAdvance(value: AtlasAuditRecord): boolean {
  return !isTerminalAudit(value) && (value.status !== 'submitted' || value.score >= 0);
}

export function AuditStableKey(value: AtlasAuditRecord): string {
  return `audit:${value.id}:${checksumAudit(value)}`;
}


