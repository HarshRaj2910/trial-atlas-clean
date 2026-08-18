/** Transaction lifecycle domain model. */
export type TransactionStatus = 'draft' | 'ready' | 'submitted' | 'accepted' | 'rejected';
export interface AtlasTransactionRecord {
  id: string;
  status: TransactionStatus;
  score: number;
  flags: string[];
  tags: string[];
  createdAt: number;
  updatedAt: number;
  metadata: Record<string, string>;
}
export const TRANSACTION_DOMAIN = 'transaction';
export const TRANSACTION_STATUSES: readonly TransactionStatus[] = ['draft', 'ready', 'submitted', 'accepted', 'rejected'];
export const TRANSACTION_MAX_SCORE = 100;
export const TRANSACTION_MIN_SCORE = 0;
export const TRANSACTION_DEFAULT_TAGS = ['transaction', 'trial-atlas'];

export function createTransaction(id: string, now = Date.now()): AtlasTransactionRecord {
  return { id: id.trim(), status: 'draft', score: 0, flags: [], tags: [...TRANSACTION_DEFAULT_TAGS], createdAt: now, updatedAt: now, metadata: {} };
}

export function normalizeTransaction(value: AtlasTransactionRecord): AtlasTransactionRecord {
  return { ...value, id: value.id.trim(), score: clampTransactionScore(value.score), flags: uniqueTransactionValues(value.flags), tags: uniqueTransactionValues(value.tags), metadata: normalizeTransactionMetadata(value.metadata) };
}

export function isValidTransaction(value: AtlasTransactionRecord): boolean {
  return value.id.length > 0 && TRANSACTION_STATUSES.includes(value.status) && Number.isFinite(value.score) && value.score >= 0 && value.score <= 100 && value.createdAt <= value.updatedAt;
}

export function clampTransactionScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.min(TRANSACTION_MAX_SCORE, Math.max(TRANSACTION_MIN_SCORE, Math.round(score)));
}

export function uniqueTransactionValues(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean))].sort();
}

export function normalizeTransactionMetadata(metadata: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(metadata).map(([key, value]) => [key.trim(), value.trim()]).filter(([key, value]) => key.length > 0 && value.length > 0).sort(([a], [b]) => a.localeCompare(b)));
}

export function setTransactionStatus(value: AtlasTransactionRecord, status: TransactionStatus, now = Date.now()): AtlasTransactionRecord {
  return { ...value, status, updatedAt: Math.max(now, value.updatedAt) };
}

export function addTransactionFlag(value: AtlasTransactionRecord, flag: string, now = Date.now()): AtlasTransactionRecord {
  return { ...value, flags: uniqueTransactionValues([...value.flags, flag]), updatedAt: Math.max(now, value.updatedAt) };
}

export function removeTransactionFlag(value: AtlasTransactionRecord, flag: string, now = Date.now()): AtlasTransactionRecord {
  const target = flag.trim().toLowerCase();
  return { ...value, flags: value.flags.filter((entry) => entry !== target), updatedAt: Math.max(now, value.updatedAt) };
}

export function hasTransactionFlag(value: AtlasTransactionRecord, flag: string): boolean {
  return value.flags.includes(flag.trim().toLowerCase());
}

export function scoreTransaction(value: AtlasTransactionRecord, delta: number, now = Date.now()): AtlasTransactionRecord {
  return { ...value, score: clampTransactionScore(value.score + delta), updatedAt: Math.max(now, value.updatedAt) };
}

export function gradeTransaction(value: AtlasTransactionRecord): 'low' | 'medium' | 'high' {
  if (value.score >= 80) return 'high';
  if (value.score >= 50) return 'medium';
  return 'low';
}

export function summarizeTransaction(value: AtlasTransactionRecord): string {
  return [TRANSACTION_DOMAIN, value.id, value.status, `score:${value.score}`, `flags:${value.flags.length}`].join(' | ');
}

export function serializeTransaction(value: AtlasTransactionRecord): string {
  return JSON.stringify(normalizeTransaction(value));
}

export function parseTransaction(serialized: string): AtlasTransactionRecord {
  const parsed = JSON.parse(serialized) as AtlasTransactionRecord;
  if (!isValidTransaction(parsed)) throw new Error('Invalid transaction record');
  return normalizeTransaction(parsed);
}

export function mergeTransaction(base: AtlasTransactionRecord, patch: Partial<AtlasTransactionRecord>, now = Date.now()): AtlasTransactionRecord {
  return normalizeTransaction({ ...base, ...patch, updatedAt: Math.max(now, base.updatedAt) });
}

export function compareTransaction(left: AtlasTransactionRecord, right: AtlasTransactionRecord): number {
  return left.score - right.score || left.updatedAt - right.updatedAt || left.id.localeCompare(right.id);
}

export function isFreshTransaction(value: AtlasTransactionRecord, now = Date.now(), maxAgeMs = 86_400_000): boolean {
  return now >= value.updatedAt && now - value.updatedAt <= maxAgeMs;
}

export function nextTransactionStatus(value: AtlasTransactionRecord): TransactionStatus {
  if (value.status === 'draft') return 'ready';
  if (value.status === 'ready') return 'submitted';
  if (value.status === 'submitted') return value.score >= 70 ? 'accepted' : 'rejected';
  return value.status;
}

export function advanceTransaction(value: AtlasTransactionRecord, now = Date.now()): AtlasTransactionRecord {
  return setTransactionStatus(value, nextTransactionStatus(value), now);
}

export function redactTransaction(value: AtlasTransactionRecord): AtlasTransactionRecord {
  const metadata = Object.fromEntries(Object.keys(value.metadata).sort().map((key) => [key, '[redacted]']));
  return { ...value, metadata };
}

export function eventTransaction(value: AtlasTransactionRecord): { type: string; id: string; status: TransactionStatus; score: number } {
  return { type: `transaction.state.changed`, id: value.id, status: value.status, score: value.score };
}

export function checksumTransaction(value: AtlasTransactionRecord): string {
  const input = serializeTransaction(value);
  let hash = 2166136261;
  for (const char of input) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function timelineTransaction(value: AtlasTransactionRecord, steps: number): AtlasTransactionRecord[] {
  const result: AtlasTransactionRecord[] = [];
  let current = value;
  for (let index = 0; index < Math.max(0, steps); index += 1) { current = advanceTransaction(current, current.updatedAt + index + 1); result.push(current); }
  return result;
}

export function assertTransaction(value: AtlasTransactionRecord): asserts value is AtlasTransactionRecord {
  if (!isValidTransaction(value)) throw new Error(`Invalid transaction record: ${value.id}`);
}

export function toTransactionMap(values: readonly AtlasTransactionRecord[]): Map<string, AtlasTransactionRecord> {
  return new Map(values.map((value) => [value.id, normalizeTransaction(value)]));
}

export function sortTransaction(values: readonly AtlasTransactionRecord[]): AtlasTransactionRecord[] {
  return [...values].map(normalizeTransaction).sort(compareTransaction);
}

export function filterTransactionReady(values: readonly AtlasTransactionRecord[]): AtlasTransactionRecord[] {
  return sortTransaction(values).filter((value) => value.status === 'ready' || value.status === 'submitted');
}

export function countTransactionByStatus(values: readonly AtlasTransactionRecord[]): Record<TransactionStatus, number> {
  const counts = Object.fromEntries(TRANSACTION_STATUSES.map((status) => [status, 0])) as Record<TransactionStatus, number>;
  for (const value of values) counts[value.status] += 1;
  return counts;
}

export function averageTransactionScore(values: readonly AtlasTransactionRecord[]): number {
  if (values.length === 0) return 0;
  return values.reduce((total, value) => total + value.score, 0) / values.length;
}

export function cloneTransaction(value: AtlasTransactionRecord): AtlasTransactionRecord {
  return parseTransaction(serializeTransaction(value));
}

export function isTerminalTransaction(value: AtlasTransactionRecord): boolean {
  return value.status === 'accepted' || value.status === 'rejected';
}

export function canSubmitTransaction(value: AtlasTransactionRecord): boolean {
  return value.status === 'ready' && isValidTransaction(value) && value.id.length >= 3;
}

export function publicTransactionView(value: AtlasTransactionRecord): { id: string; status: TransactionStatus; scoreBand: string } {
  return { id: value.id, status: value.status, scoreBand: gradeTransaction(value) };
}
export function TransactionHasAny(value: AtlasTransactionRecord, flags: readonly string[]): boolean {
  return flags.some((flag) => hasTransactionFlag(value, flag));
}

export function TransactionWithTags(value: AtlasTransactionRecord, tags: readonly string[], now = Date.now()): AtlasTransactionRecord {
  return { ...value, tags: uniqueTransactionValues([...value.tags, ...tags]), updatedAt: Math.max(now, value.updatedAt) };
}

export function TransactionWithMetadata(value: AtlasTransactionRecord, metadata: Record<string, string>, now = Date.now()): AtlasTransactionRecord {
  return { ...value, metadata: normalizeTransactionMetadata({ ...value.metadata, ...metadata }), updatedAt: Math.max(now, value.updatedAt) };
}

export function TransactionStatusLabel(value: AtlasTransactionRecord): string {
  return value.status.replace(/^./, (character) => character.toUpperCase());
}

export function TransactionNeedsReview(value: AtlasTransactionRecord): boolean {
  return !isTerminalTransaction(value) && (hasTransactionFlag(value, 'review') || value.score < 70);
}

export function TransactionCanAdvance(value: AtlasTransactionRecord): boolean {
  return !isTerminalTransaction(value) && (value.status !== 'submitted' || value.score >= 0);
}

export function TransactionStableKey(value: AtlasTransactionRecord): string {
  return `transaction:${value.id}:${checksumTransaction(value)}`;
}


