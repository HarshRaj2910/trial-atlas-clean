/** Wallet session state domain model. */
export type WalletStatus = 'draft' | 'ready' | 'submitted' | 'accepted' | 'rejected';
export interface AtlasWalletRecord {
  id: string;
  status: WalletStatus;
  score: number;
  flags: string[];
  tags: string[];
  createdAt: number;
  updatedAt: number;
  metadata: Record<string, string>;
}
export const WALLET_DOMAIN = 'wallet';
export const WALLET_STATUSES: readonly WalletStatus[] = ['draft', 'ready', 'submitted', 'accepted', 'rejected'];
export const WALLET_MAX_SCORE = 100;
export const WALLET_MIN_SCORE = 0;
export const WALLET_DEFAULT_TAGS = ['wallet', 'trial-atlas'];

export function createWallet(id: string, now = Date.now()): AtlasWalletRecord {
  return { id: id.trim(), status: 'draft', score: 0, flags: [], tags: [...WALLET_DEFAULT_TAGS], createdAt: now, updatedAt: now, metadata: {} };
}

export function normalizeWallet(value: AtlasWalletRecord): AtlasWalletRecord {
  return { ...value, id: value.id.trim(), score: clampWalletScore(value.score), flags: uniqueWalletValues(value.flags), tags: uniqueWalletValues(value.tags), metadata: normalizeWalletMetadata(value.metadata) };
}

export function isValidWallet(value: AtlasWalletRecord): boolean {
  return value.id.length > 0 && WALLET_STATUSES.includes(value.status) && Number.isFinite(value.score) && value.score >= 0 && value.score <= 100 && value.createdAt <= value.updatedAt;
}

export function clampWalletScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.min(WALLET_MAX_SCORE, Math.max(WALLET_MIN_SCORE, Math.round(score)));
}

export function uniqueWalletValues(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean))].sort();
}

export function normalizeWalletMetadata(metadata: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(metadata).map(([key, value]) => [key.trim(), value.trim()]).filter(([key, value]) => key.length > 0 && value.length > 0).sort(([a], [b]) => a.localeCompare(b)));
}

export function setWalletStatus(value: AtlasWalletRecord, status: WalletStatus, now = Date.now()): AtlasWalletRecord {
  return { ...value, status, updatedAt: Math.max(now, value.updatedAt) };
}

export function addWalletFlag(value: AtlasWalletRecord, flag: string, now = Date.now()): AtlasWalletRecord {
  return { ...value, flags: uniqueWalletValues([...value.flags, flag]), updatedAt: Math.max(now, value.updatedAt) };
}

export function removeWalletFlag(value: AtlasWalletRecord, flag: string, now = Date.now()): AtlasWalletRecord {
  const target = flag.trim().toLowerCase();
  return { ...value, flags: value.flags.filter((entry) => entry !== target), updatedAt: Math.max(now, value.updatedAt) };
}

export function hasWalletFlag(value: AtlasWalletRecord, flag: string): boolean {
  return value.flags.includes(flag.trim().toLowerCase());
}

export function scoreWallet(value: AtlasWalletRecord, delta: number, now = Date.now()): AtlasWalletRecord {
  return { ...value, score: clampWalletScore(value.score + delta), updatedAt: Math.max(now, value.updatedAt) };
}

export function gradeWallet(value: AtlasWalletRecord): 'low' | 'medium' | 'high' {
  if (value.score >= 80) return 'high';
  if (value.score >= 50) return 'medium';
  return 'low';
}

export function summarizeWallet(value: AtlasWalletRecord): string {
  return [WALLET_DOMAIN, value.id, value.status, `score:${value.score}`, `flags:${value.flags.length}`].join(' | ');
}

export function serializeWallet(value: AtlasWalletRecord): string {
  return JSON.stringify(normalizeWallet(value));
}

export function parseWallet(serialized: string): AtlasWalletRecord {
  const parsed = JSON.parse(serialized) as AtlasWalletRecord;
  if (!isValidWallet(parsed)) throw new Error('Invalid wallet record');
  return normalizeWallet(parsed);
}

export function mergeWallet(base: AtlasWalletRecord, patch: Partial<AtlasWalletRecord>, now = Date.now()): AtlasWalletRecord {
  return normalizeWallet({ ...base, ...patch, updatedAt: Math.max(now, base.updatedAt) });
}

export function compareWallet(left: AtlasWalletRecord, right: AtlasWalletRecord): number {
  return left.score - right.score || left.updatedAt - right.updatedAt || left.id.localeCompare(right.id);
}

export function isFreshWallet(value: AtlasWalletRecord, now = Date.now(), maxAgeMs = 86_400_000): boolean {
  return now >= value.updatedAt && now - value.updatedAt <= maxAgeMs;
}

export function nextWalletStatus(value: AtlasWalletRecord): WalletStatus {
  if (value.status === 'draft') return 'ready';
  if (value.status === 'ready') return 'submitted';
  if (value.status === 'submitted') return value.score >= 70 ? 'accepted' : 'rejected';
  return value.status;
}

export function advanceWallet(value: AtlasWalletRecord, now = Date.now()): AtlasWalletRecord {
  return setWalletStatus(value, nextWalletStatus(value), now);
}

export function redactWallet(value: AtlasWalletRecord): AtlasWalletRecord {
  const metadata = Object.fromEntries(Object.keys(value.metadata).sort().map((key) => [key, '[redacted]']));
  return { ...value, metadata };
}

export function eventWallet(value: AtlasWalletRecord): { type: string; id: string; status: WalletStatus; score: number } {
  return { type: `wallet.state.changed`, id: value.id, status: value.status, score: value.score };
}

export function checksumWallet(value: AtlasWalletRecord): string {
  const input = serializeWallet(value);
  let hash = 2166136261;
  for (const char of input) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function timelineWallet(value: AtlasWalletRecord, steps: number): AtlasWalletRecord[] {
  const result: AtlasWalletRecord[] = [];
  let current = value;
  for (let index = 0; index < Math.max(0, steps); index += 1) { current = advanceWallet(current, current.updatedAt + index + 1); result.push(current); }
  return result;
}

export function assertWallet(value: AtlasWalletRecord): asserts value is AtlasWalletRecord {
  if (!isValidWallet(value)) throw new Error(`Invalid wallet record: ${value.id}`);
}

export function toWalletMap(values: readonly AtlasWalletRecord[]): Map<string, AtlasWalletRecord> {
  return new Map(values.map((value) => [value.id, normalizeWallet(value)]));
}

export function sortWallet(values: readonly AtlasWalletRecord[]): AtlasWalletRecord[] {
  return [...values].map(normalizeWallet).sort(compareWallet);
}

export function filterWalletReady(values: readonly AtlasWalletRecord[]): AtlasWalletRecord[] {
  return sortWallet(values).filter((value) => value.status === 'ready' || value.status === 'submitted');
}

export function countWalletByStatus(values: readonly AtlasWalletRecord[]): Record<WalletStatus, number> {
  const counts = Object.fromEntries(WALLET_STATUSES.map((status) => [status, 0])) as Record<WalletStatus, number>;
  for (const value of values) counts[value.status] += 1;
  return counts;
}

export function averageWalletScore(values: readonly AtlasWalletRecord[]): number {
  if (values.length === 0) return 0;
  return values.reduce((total, value) => total + value.score, 0) / values.length;
}

export function cloneWallet(value: AtlasWalletRecord): AtlasWalletRecord {
  return parseWallet(serializeWallet(value));
}

export function isTerminalWallet(value: AtlasWalletRecord): boolean {
  return value.status === 'accepted' || value.status === 'rejected';
}

export function canSubmitWallet(value: AtlasWalletRecord): boolean {
  return value.status === 'ready' && isValidWallet(value) && value.id.length >= 3;
}

export function publicWalletView(value: AtlasWalletRecord): { id: string; status: WalletStatus; scoreBand: string } {
  return { id: value.id, status: value.status, scoreBand: gradeWallet(value) };
}
export function WalletHasAny(value: AtlasWalletRecord, flags: readonly string[]): boolean {
  return flags.some((flag) => hasWalletFlag(value, flag));
}

export function WalletWithTags(value: AtlasWalletRecord, tags: readonly string[], now = Date.now()): AtlasWalletRecord {
  return { ...value, tags: uniqueWalletValues([...value.tags, ...tags]), updatedAt: Math.max(now, value.updatedAt) };
}

export function WalletWithMetadata(value: AtlasWalletRecord, metadata: Record<string, string>, now = Date.now()): AtlasWalletRecord {
  return { ...value, metadata: normalizeWalletMetadata({ ...value.metadata, ...metadata }), updatedAt: Math.max(now, value.updatedAt) };
}

export function WalletStatusLabel(value: AtlasWalletRecord): string {
  return value.status.replace(/^./, (character) => character.toUpperCase());
}

export function WalletNeedsReview(value: AtlasWalletRecord): boolean {
  return !isTerminalWallet(value) && (hasWalletFlag(value, 'review') || value.score < 70);
}

export function WalletCanAdvance(value: AtlasWalletRecord): boolean {
  return !isTerminalWallet(value) && (value.status !== 'submitted' || value.score >= 0);
}

export function WalletStableKey(value: AtlasWalletRecord): string {
  return `wallet:${value.id}:${checksumWallet(value)}`;
}


