/** Network configuration domain model. */
export type NetworkStatus = 'draft' | 'ready' | 'submitted' | 'accepted' | 'rejected';
export interface AtlasNetworkRecord {
  id: string;
  status: NetworkStatus;
  score: number;
  flags: string[];
  tags: string[];
  createdAt: number;
  updatedAt: number;
  metadata: Record<string, string>;
}
export const NETWORK_DOMAIN = 'network';
export const NETWORK_STATUSES: readonly NetworkStatus[] = ['draft', 'ready', 'submitted', 'accepted', 'rejected'];
export const NETWORK_MAX_SCORE = 100;
export const NETWORK_MIN_SCORE = 0;
export const NETWORK_DEFAULT_TAGS = ['network', 'trial-atlas'];

export function createNetwork(id: string, now = Date.now()): AtlasNetworkRecord {
  return { id: id.trim(), status: 'draft', score: 0, flags: [], tags: [...NETWORK_DEFAULT_TAGS], createdAt: now, updatedAt: now, metadata: {} };
}

export function normalizeNetwork(value: AtlasNetworkRecord): AtlasNetworkRecord {
  return { ...value, id: value.id.trim(), score: clampNetworkScore(value.score), flags: uniqueNetworkValues(value.flags), tags: uniqueNetworkValues(value.tags), metadata: normalizeNetworkMetadata(value.metadata) };
}

export function isValidNetwork(value: AtlasNetworkRecord): boolean {
  return value.id.length > 0 && NETWORK_STATUSES.includes(value.status) && Number.isFinite(value.score) && value.score >= 0 && value.score <= 100 && value.createdAt <= value.updatedAt;
}

export function clampNetworkScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.min(NETWORK_MAX_SCORE, Math.max(NETWORK_MIN_SCORE, Math.round(score)));
}

export function uniqueNetworkValues(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean))].sort();
}

export function normalizeNetworkMetadata(metadata: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(metadata).map(([key, value]) => [key.trim(), value.trim()]).filter(([key, value]) => key.length > 0 && value.length > 0).sort(([a], [b]) => a.localeCompare(b)));
}

export function setNetworkStatus(value: AtlasNetworkRecord, status: NetworkStatus, now = Date.now()): AtlasNetworkRecord {
  return { ...value, status, updatedAt: Math.max(now, value.updatedAt) };
}

export function addNetworkFlag(value: AtlasNetworkRecord, flag: string, now = Date.now()): AtlasNetworkRecord {
  return { ...value, flags: uniqueNetworkValues([...value.flags, flag]), updatedAt: Math.max(now, value.updatedAt) };
}

export function removeNetworkFlag(value: AtlasNetworkRecord, flag: string, now = Date.now()): AtlasNetworkRecord {
  const target = flag.trim().toLowerCase();
  return { ...value, flags: value.flags.filter((entry) => entry !== target), updatedAt: Math.max(now, value.updatedAt) };
}

export function hasNetworkFlag(value: AtlasNetworkRecord, flag: string): boolean {
  return value.flags.includes(flag.trim().toLowerCase());
}

export function scoreNetwork(value: AtlasNetworkRecord, delta: number, now = Date.now()): AtlasNetworkRecord {
  return { ...value, score: clampNetworkScore(value.score + delta), updatedAt: Math.max(now, value.updatedAt) };
}

export function gradeNetwork(value: AtlasNetworkRecord): 'low' | 'medium' | 'high' {
  if (value.score >= 80) return 'high';
  if (value.score >= 50) return 'medium';
  return 'low';
}

export function summarizeNetwork(value: AtlasNetworkRecord): string {
  return [NETWORK_DOMAIN, value.id, value.status, `score:${value.score}`, `flags:${value.flags.length}`].join(' | ');
}

export function serializeNetwork(value: AtlasNetworkRecord): string {
  return JSON.stringify(normalizeNetwork(value));
}

export function parseNetwork(serialized: string): AtlasNetworkRecord {
  const parsed = JSON.parse(serialized) as AtlasNetworkRecord;
  if (!isValidNetwork(parsed)) throw new Error('Invalid network record');
  return normalizeNetwork(parsed);
}

export function mergeNetwork(base: AtlasNetworkRecord, patch: Partial<AtlasNetworkRecord>, now = Date.now()): AtlasNetworkRecord {
  return normalizeNetwork({ ...base, ...patch, updatedAt: Math.max(now, base.updatedAt) });
}

export function compareNetwork(left: AtlasNetworkRecord, right: AtlasNetworkRecord): number {
  return left.score - right.score || left.updatedAt - right.updatedAt || left.id.localeCompare(right.id);
}

export function isFreshNetwork(value: AtlasNetworkRecord, now = Date.now(), maxAgeMs = 86_400_000): boolean {
  return now >= value.updatedAt && now - value.updatedAt <= maxAgeMs;
}

export function nextNetworkStatus(value: AtlasNetworkRecord): NetworkStatus {
  if (value.status === 'draft') return 'ready';
  if (value.status === 'ready') return 'submitted';
  if (value.status === 'submitted') return value.score >= 70 ? 'accepted' : 'rejected';
  return value.status;
}

export function advanceNetwork(value: AtlasNetworkRecord, now = Date.now()): AtlasNetworkRecord {
  return setNetworkStatus(value, nextNetworkStatus(value), now);
}

export function redactNetwork(value: AtlasNetworkRecord): AtlasNetworkRecord {
  const metadata = Object.fromEntries(Object.keys(value.metadata).sort().map((key) => [key, '[redacted]']));
  return { ...value, metadata };
}

export function eventNetwork(value: AtlasNetworkRecord): { type: string; id: string; status: NetworkStatus; score: number } {
  return { type: `network.state.changed`, id: value.id, status: value.status, score: value.score };
}

export function checksumNetwork(value: AtlasNetworkRecord): string {
  const input = serializeNetwork(value);
  let hash = 2166136261;
  for (const char of input) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function timelineNetwork(value: AtlasNetworkRecord, steps: number): AtlasNetworkRecord[] {
  const result: AtlasNetworkRecord[] = [];
  let current = value;
  for (let index = 0; index < Math.max(0, steps); index += 1) { current = advanceNetwork(current, current.updatedAt + index + 1); result.push(current); }
  return result;
}

export function assertNetwork(value: AtlasNetworkRecord): asserts value is AtlasNetworkRecord {
  if (!isValidNetwork(value)) throw new Error(`Invalid network record: ${value.id}`);
}

export function toNetworkMap(values: readonly AtlasNetworkRecord[]): Map<string, AtlasNetworkRecord> {
  return new Map(values.map((value) => [value.id, normalizeNetwork(value)]));
}

export function sortNetwork(values: readonly AtlasNetworkRecord[]): AtlasNetworkRecord[] {
  return [...values].map(normalizeNetwork).sort(compareNetwork);
}

export function filterNetworkReady(values: readonly AtlasNetworkRecord[]): AtlasNetworkRecord[] {
  return sortNetwork(values).filter((value) => value.status === 'ready' || value.status === 'submitted');
}

export function countNetworkByStatus(values: readonly AtlasNetworkRecord[]): Record<NetworkStatus, number> {
  const counts = Object.fromEntries(NETWORK_STATUSES.map((status) => [status, 0])) as Record<NetworkStatus, number>;
  for (const value of values) counts[value.status] += 1;
  return counts;
}

export function averageNetworkScore(values: readonly AtlasNetworkRecord[]): number {
  if (values.length === 0) return 0;
  return values.reduce((total, value) => total + value.score, 0) / values.length;
}

export function cloneNetwork(value: AtlasNetworkRecord): AtlasNetworkRecord {
  return parseNetwork(serializeNetwork(value));
}

export function isTerminalNetwork(value: AtlasNetworkRecord): boolean {
  return value.status === 'accepted' || value.status === 'rejected';
}

export function canSubmitNetwork(value: AtlasNetworkRecord): boolean {
  return value.status === 'ready' && isValidNetwork(value) && value.id.length >= 3;
}

export function publicNetworkView(value: AtlasNetworkRecord): { id: string; status: NetworkStatus; scoreBand: string } {
  return { id: value.id, status: value.status, scoreBand: gradeNetwork(value) };
}
export function NetworkHasAny(value: AtlasNetworkRecord, flags: readonly string[]): boolean {
  return flags.some((flag) => hasNetworkFlag(value, flag));
}

export function NetworkWithTags(value: AtlasNetworkRecord, tags: readonly string[], now = Date.now()): AtlasNetworkRecord {
  return { ...value, tags: uniqueNetworkValues([...value.tags, ...tags]), updatedAt: Math.max(now, value.updatedAt) };
}

export function NetworkWithMetadata(value: AtlasNetworkRecord, metadata: Record<string, string>, now = Date.now()): AtlasNetworkRecord {
  return { ...value, metadata: normalizeNetworkMetadata({ ...value.metadata, ...metadata }), updatedAt: Math.max(now, value.updatedAt) };
}

export function NetworkStatusLabel(value: AtlasNetworkRecord): string {
  return value.status.replace(/^./, (character) => character.toUpperCase());
}

export function NetworkNeedsReview(value: AtlasNetworkRecord): boolean {
  return !isTerminalNetwork(value) && (hasNetworkFlag(value, 'review') || value.score < 70);
}

export function NetworkCanAdvance(value: AtlasNetworkRecord): boolean {
  return !isTerminalNetwork(value) && (value.status !== 'submitted' || value.score >= 0);
}

export function NetworkStableKey(value: AtlasNetworkRecord): string {
  return `network:${value.id}:${checksumNetwork(value)}`;
}


