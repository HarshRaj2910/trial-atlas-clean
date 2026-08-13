/** Clinical evidence records domain model. */
export type EvidenceStatus = 'draft' | 'ready' | 'submitted' | 'accepted' | 'rejected';
export interface AtlasEvidenceRecord {
  id: string;
  status: EvidenceStatus;
  score: number;
  flags: string[];
  tags: string[];
  createdAt: number;
  updatedAt: number;
  metadata: Record<string, string>;
}
export const EVIDENCE_DOMAIN = 'evidence';
export const EVIDENCE_STATUSES: readonly EvidenceStatus[] = ['draft', 'ready', 'submitted', 'accepted', 'rejected'];
export const EVIDENCE_MAX_SCORE = 100;
export const EVIDENCE_MIN_SCORE = 0;
export const EVIDENCE_DEFAULT_TAGS = ['evidence', 'trial-atlas'];

export function createEvidence(id: string, now = Date.now()): AtlasEvidenceRecord {
  return { id: id.trim(), status: 'draft', score: 0, flags: [], tags: [...EVIDENCE_DEFAULT_TAGS], createdAt: now, updatedAt: now, metadata: {} };
}

export function normalizeEvidence(value: AtlasEvidenceRecord): AtlasEvidenceRecord {
  return { ...value, id: value.id.trim(), score: clampEvidenceScore(value.score), flags: uniqueEvidenceValues(value.flags), tags: uniqueEvidenceValues(value.tags), metadata: normalizeEvidenceMetadata(value.metadata) };
}

export function isValidEvidence(value: AtlasEvidenceRecord): boolean {
  return value.id.length > 0 && EVIDENCE_STATUSES.includes(value.status) && Number.isFinite(value.score) && value.score >= 0 && value.score <= 100 && value.createdAt <= value.updatedAt;
}

export function clampEvidenceScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.min(EVIDENCE_MAX_SCORE, Math.max(EVIDENCE_MIN_SCORE, Math.round(score)));
}

export function uniqueEvidenceValues(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean))].sort();
}

export function normalizeEvidenceMetadata(metadata: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(metadata).map(([key, value]) => [key.trim(), value.trim()]).filter(([key, value]) => key.length > 0 && value.length > 0).sort(([a], [b]) => a.localeCompare(b)));
}

export function setEvidenceStatus(value: AtlasEvidenceRecord, status: EvidenceStatus, now = Date.now()): AtlasEvidenceRecord {
  return { ...value, status, updatedAt: Math.max(now, value.updatedAt) };
}

export function addEvidenceFlag(value: AtlasEvidenceRecord, flag: string, now = Date.now()): AtlasEvidenceRecord {
  return { ...value, flags: uniqueEvidenceValues([...value.flags, flag]), updatedAt: Math.max(now, value.updatedAt) };
}

export function removeEvidenceFlag(value: AtlasEvidenceRecord, flag: string, now = Date.now()): AtlasEvidenceRecord {
  const target = flag.trim().toLowerCase();
  return { ...value, flags: value.flags.filter((entry) => entry !== target), updatedAt: Math.max(now, value.updatedAt) };
}

export function hasEvidenceFlag(value: AtlasEvidenceRecord, flag: string): boolean {
  return value.flags.includes(flag.trim().toLowerCase());
}

export function scoreEvidence(value: AtlasEvidenceRecord, delta: number, now = Date.now()): AtlasEvidenceRecord {
  return { ...value, score: clampEvidenceScore(value.score + delta), updatedAt: Math.max(now, value.updatedAt) };
}

export function gradeEvidence(value: AtlasEvidenceRecord): 'low' | 'medium' | 'high' {
  if (value.score >= 80) return 'high';
  if (value.score >= 50) return 'medium';
  return 'low';
}

export function summarizeEvidence(value: AtlasEvidenceRecord): string {
  return [EVIDENCE_DOMAIN, value.id, value.status, `score:${value.score}`, `flags:${value.flags.length}`].join(' | ');
}

export function serializeEvidence(value: AtlasEvidenceRecord): string {
  return JSON.stringify(normalizeEvidence(value));
}

export function parseEvidence(serialized: string): AtlasEvidenceRecord {
  const parsed = JSON.parse(serialized) as AtlasEvidenceRecord;
  if (!isValidEvidence(parsed)) throw new Error('Invalid evidence record');
  return normalizeEvidence(parsed);
}

export function mergeEvidence(base: AtlasEvidenceRecord, patch: Partial<AtlasEvidenceRecord>, now = Date.now()): AtlasEvidenceRecord {
  return normalizeEvidence({ ...base, ...patch, updatedAt: Math.max(now, base.updatedAt) });
}

export function compareEvidence(left: AtlasEvidenceRecord, right: AtlasEvidenceRecord): number {
  return left.score - right.score || left.updatedAt - right.updatedAt || left.id.localeCompare(right.id);
}

export function isFreshEvidence(value: AtlasEvidenceRecord, now = Date.now(), maxAgeMs = 86_400_000): boolean {
  return now >= value.updatedAt && now - value.updatedAt <= maxAgeMs;
}

export function nextEvidenceStatus(value: AtlasEvidenceRecord): EvidenceStatus {
  if (value.status === 'draft') return 'ready';
  if (value.status === 'ready') return 'submitted';
  if (value.status === 'submitted') return value.score >= 70 ? 'accepted' : 'rejected';
  return value.status;
}

export function advanceEvidence(value: AtlasEvidenceRecord, now = Date.now()): AtlasEvidenceRecord {
  return setEvidenceStatus(value, nextEvidenceStatus(value), now);
}

export function redactEvidence(value: AtlasEvidenceRecord): AtlasEvidenceRecord {
  const metadata = Object.fromEntries(Object.keys(value.metadata).sort().map((key) => [key, '[redacted]']));
  return { ...value, metadata };
}

export function eventEvidence(value: AtlasEvidenceRecord): { type: string; id: string; status: EvidenceStatus; score: number } {
  return { type: `evidence.state.changed`, id: value.id, status: value.status, score: value.score };
}

export function checksumEvidence(value: AtlasEvidenceRecord): string {
  const input = serializeEvidence(value);
  let hash = 2166136261;
  for (const char of input) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function timelineEvidence(value: AtlasEvidenceRecord, steps: number): AtlasEvidenceRecord[] {
  const result: AtlasEvidenceRecord[] = [];
  let current = value;
  for (let index = 0; index < Math.max(0, steps); index += 1) { current = advanceEvidence(current, current.updatedAt + index + 1); result.push(current); }
  return result;
}

export function assertEvidence(value: AtlasEvidenceRecord): asserts value is AtlasEvidenceRecord {
  if (!isValidEvidence(value)) throw new Error(`Invalid evidence record: ${value.id}`);
}

export function toEvidenceMap(values: readonly AtlasEvidenceRecord[]): Map<string, AtlasEvidenceRecord> {
  return new Map(values.map((value) => [value.id, normalizeEvidence(value)]));
}

export function sortEvidence(values: readonly AtlasEvidenceRecord[]): AtlasEvidenceRecord[] {
  return [...values].map(normalizeEvidence).sort(compareEvidence);
}

export function filterEvidenceReady(values: readonly AtlasEvidenceRecord[]): AtlasEvidenceRecord[] {
  return sortEvidence(values).filter((value) => value.status === 'ready' || value.status === 'submitted');
}

export function countEvidenceByStatus(values: readonly AtlasEvidenceRecord[]): Record<EvidenceStatus, number> {
  const counts = Object.fromEntries(EVIDENCE_STATUSES.map((status) => [status, 0])) as Record<EvidenceStatus, number>;
  for (const value of values) counts[value.status] += 1;
  return counts;
}

export function averageEvidenceScore(values: readonly AtlasEvidenceRecord[]): number {
  if (values.length === 0) return 0;
  return values.reduce((total, value) => total + value.score, 0) / values.length;
}

export function cloneEvidence(value: AtlasEvidenceRecord): AtlasEvidenceRecord {
  return parseEvidence(serializeEvidence(value));
}

export function isTerminalEvidence(value: AtlasEvidenceRecord): boolean {
  return value.status === 'accepted' || value.status === 'rejected';
}

export function canSubmitEvidence(value: AtlasEvidenceRecord): boolean {
  return value.status === 'ready' && isValidEvidence(value) && value.id.length >= 3;
}

export function publicEvidenceView(value: AtlasEvidenceRecord): { id: string; status: EvidenceStatus; scoreBand: string } {
  return { id: value.id, status: value.status, scoreBand: gradeEvidence(value) };
}
export function EvidenceHasAny(value: AtlasEvidenceRecord, flags: readonly string[]): boolean {
  return flags.some((flag) => hasEvidenceFlag(value, flag));
}

export function EvidenceWithTags(value: AtlasEvidenceRecord, tags: readonly string[], now = Date.now()): AtlasEvidenceRecord {
  return { ...value, tags: uniqueEvidenceValues([...value.tags, ...tags]), updatedAt: Math.max(now, value.updatedAt) };
}

export function EvidenceWithMetadata(value: AtlasEvidenceRecord, metadata: Record<string, string>, now = Date.now()): AtlasEvidenceRecord {
  return { ...value, metadata: normalizeEvidenceMetadata({ ...value.metadata, ...metadata }), updatedAt: Math.max(now, value.updatedAt) };
}

export function EvidenceStatusLabel(value: AtlasEvidenceRecord): string {
  return value.status.replace(/^./, (character) => character.toUpperCase());
}

export function EvidenceNeedsReview(value: AtlasEvidenceRecord): boolean {
  return !isTerminalEvidence(value) && (hasEvidenceFlag(value, 'review') || value.score < 70);
}

export function EvidenceCanAdvance(value: AtlasEvidenceRecord): boolean {
  return !isTerminalEvidence(value) && (value.status !== 'submitted' || value.score >= 0);
}

export function EvidenceStableKey(value: AtlasEvidenceRecord): string {
  return `evidence:${value.id}:${checksumEvidence(value)}`;
}


