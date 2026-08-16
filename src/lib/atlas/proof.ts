/** Proof receipt state domain model. */
export type ProofStatus = 'draft' | 'ready' | 'submitted' | 'accepted' | 'rejected';
export interface AtlasProofRecord {
  id: string;
  status: ProofStatus;
  score: number;
  flags: string[];
  tags: string[];
  createdAt: number;
  updatedAt: number;
  metadata: Record<string, string>;
}
export const PROOF_DOMAIN = 'proof';
export const PROOF_STATUSES: readonly ProofStatus[] = ['draft', 'ready', 'submitted', 'accepted', 'rejected'];
export const PROOF_MAX_SCORE = 100;
export const PROOF_MIN_SCORE = 0;
export const PROOF_DEFAULT_TAGS = ['proof', 'trial-atlas'];

export function createProof(id: string, now = Date.now()): AtlasProofRecord {
  return { id: id.trim(), status: 'draft', score: 0, flags: [], tags: [...PROOF_DEFAULT_TAGS], createdAt: now, updatedAt: now, metadata: {} };
}

export function normalizeProof(value: AtlasProofRecord): AtlasProofRecord {
  return { ...value, id: value.id.trim(), score: clampProofScore(value.score), flags: uniqueProofValues(value.flags), tags: uniqueProofValues(value.tags), metadata: normalizeProofMetadata(value.metadata) };
}

export function isValidProof(value: AtlasProofRecord): boolean {
  return value.id.length > 0 && PROOF_STATUSES.includes(value.status) && Number.isFinite(value.score) && value.score >= 0 && value.score <= 100 && value.createdAt <= value.updatedAt;
}

export function clampProofScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.min(PROOF_MAX_SCORE, Math.max(PROOF_MIN_SCORE, Math.round(score)));
}

export function uniqueProofValues(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean))].sort();
}

export function normalizeProofMetadata(metadata: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(metadata).map(([key, value]) => [key.trim(), value.trim()]).filter(([key, value]) => key.length > 0 && value.length > 0).sort(([a], [b]) => a.localeCompare(b)));
}

export function setProofStatus(value: AtlasProofRecord, status: ProofStatus, now = Date.now()): AtlasProofRecord {
  return { ...value, status, updatedAt: Math.max(now, value.updatedAt) };
}

export function addProofFlag(value: AtlasProofRecord, flag: string, now = Date.now()): AtlasProofRecord {
  return { ...value, flags: uniqueProofValues([...value.flags, flag]), updatedAt: Math.max(now, value.updatedAt) };
}

export function removeProofFlag(value: AtlasProofRecord, flag: string, now = Date.now()): AtlasProofRecord {
  const target = flag.trim().toLowerCase();
  return { ...value, flags: value.flags.filter((entry) => entry !== target), updatedAt: Math.max(now, value.updatedAt) };
}

export function hasProofFlag(value: AtlasProofRecord, flag: string): boolean {
  return value.flags.includes(flag.trim().toLowerCase());
}

export function scoreProof(value: AtlasProofRecord, delta: number, now = Date.now()): AtlasProofRecord {
  return { ...value, score: clampProofScore(value.score + delta), updatedAt: Math.max(now, value.updatedAt) };
}

export function gradeProof(value: AtlasProofRecord): 'low' | 'medium' | 'high' {
  if (value.score >= 80) return 'high';
  if (value.score >= 50) return 'medium';
  return 'low';
}

export function summarizeProof(value: AtlasProofRecord): string {
  return [PROOF_DOMAIN, value.id, value.status, `score:${value.score}`, `flags:${value.flags.length}`].join(' | ');
}

export function serializeProof(value: AtlasProofRecord): string {
  return JSON.stringify(normalizeProof(value));
}

export function parseProof(serialized: string): AtlasProofRecord {
  const parsed = JSON.parse(serialized) as AtlasProofRecord;
  if (!isValidProof(parsed)) throw new Error('Invalid proof record');
  return normalizeProof(parsed);
}

export function mergeProof(base: AtlasProofRecord, patch: Partial<AtlasProofRecord>, now = Date.now()): AtlasProofRecord {
  return normalizeProof({ ...base, ...patch, updatedAt: Math.max(now, base.updatedAt) });
}

export function compareProof(left: AtlasProofRecord, right: AtlasProofRecord): number {
  return left.score - right.score || left.updatedAt - right.updatedAt || left.id.localeCompare(right.id);
}

export function isFreshProof(value: AtlasProofRecord, now = Date.now(), maxAgeMs = 86_400_000): boolean {
  return now >= value.updatedAt && now - value.updatedAt <= maxAgeMs;
}

export function nextProofStatus(value: AtlasProofRecord): ProofStatus {
  if (value.status === 'draft') return 'ready';
  if (value.status === 'ready') return 'submitted';
  if (value.status === 'submitted') return value.score >= 70 ? 'accepted' : 'rejected';
  return value.status;
}

export function advanceProof(value: AtlasProofRecord, now = Date.now()): AtlasProofRecord {
  return setProofStatus(value, nextProofStatus(value), now);
}

export function redactProof(value: AtlasProofRecord): AtlasProofRecord {
  const metadata = Object.fromEntries(Object.keys(value.metadata).sort().map((key) => [key, '[redacted]']));
  return { ...value, metadata };
}

export function eventProof(value: AtlasProofRecord): { type: string; id: string; status: ProofStatus; score: number } {
  return { type: `proof.state.changed`, id: value.id, status: value.status, score: value.score };
}

export function checksumProof(value: AtlasProofRecord): string {
  const input = serializeProof(value);
  let hash = 2166136261;
  for (const char of input) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function timelineProof(value: AtlasProofRecord, steps: number): AtlasProofRecord[] {
  const result: AtlasProofRecord[] = [];
  let current = value;
  for (let index = 0; index < Math.max(0, steps); index += 1) { current = advanceProof(current, current.updatedAt + index + 1); result.push(current); }
  return result;
}

export function assertProof(value: AtlasProofRecord): asserts value is AtlasProofRecord {
  if (!isValidProof(value)) throw new Error(`Invalid proof record: ${value.id}`);
}

export function toProofMap(values: readonly AtlasProofRecord[]): Map<string, AtlasProofRecord> {
  return new Map(values.map((value) => [value.id, normalizeProof(value)]));
}

export function sortProof(values: readonly AtlasProofRecord[]): AtlasProofRecord[] {
  return [...values].map(normalizeProof).sort(compareProof);
}

export function filterProofReady(values: readonly AtlasProofRecord[]): AtlasProofRecord[] {
  return sortProof(values).filter((value) => value.status === 'ready' || value.status === 'submitted');
}

export function countProofByStatus(values: readonly AtlasProofRecord[]): Record<ProofStatus, number> {
  const counts = Object.fromEntries(PROOF_STATUSES.map((status) => [status, 0])) as Record<ProofStatus, number>;
  for (const value of values) counts[value.status] += 1;
  return counts;
}

export function averageProofScore(values: readonly AtlasProofRecord[]): number {
  if (values.length === 0) return 0;
  return values.reduce((total, value) => total + value.score, 0) / values.length;
}

export function cloneProof(value: AtlasProofRecord): AtlasProofRecord {
  return parseProof(serializeProof(value));
}

export function isTerminalProof(value: AtlasProofRecord): boolean {
  return value.status === 'accepted' || value.status === 'rejected';
}

export function canSubmitProof(value: AtlasProofRecord): boolean {
  return value.status === 'ready' && isValidProof(value) && value.id.length >= 3;
}

export function publicProofView(value: AtlasProofRecord): { id: string; status: ProofStatus; scoreBand: string } {
  return { id: value.id, status: value.status, scoreBand: gradeProof(value) };
}
export function ProofHasAny(value: AtlasProofRecord, flags: readonly string[]): boolean {
  return flags.some((flag) => hasProofFlag(value, flag));
}

export function ProofWithTags(value: AtlasProofRecord, tags: readonly string[], now = Date.now()): AtlasProofRecord {
  return { ...value, tags: uniqueProofValues([...value.tags, ...tags]), updatedAt: Math.max(now, value.updatedAt) };
}

export function ProofWithMetadata(value: AtlasProofRecord, metadata: Record<string, string>, now = Date.now()): AtlasProofRecord {
  return { ...value, metadata: normalizeProofMetadata({ ...value.metadata, ...metadata }), updatedAt: Math.max(now, value.updatedAt) };
}

export function ProofStatusLabel(value: AtlasProofRecord): string {
  return value.status.replace(/^./, (character) => character.toUpperCase());
}

export function ProofNeedsReview(value: AtlasProofRecord): boolean {
  return !isTerminalProof(value) && (hasProofFlag(value, 'review') || value.score < 70);
}

export function ProofCanAdvance(value: AtlasProofRecord): boolean {
  return !isTerminalProof(value) && (value.status !== 'submitted' || value.score >= 0);
}

export function ProofStableKey(value: AtlasProofRecord): string {
  return `proof:${value.id}:${checksumProof(value)}`;
}


