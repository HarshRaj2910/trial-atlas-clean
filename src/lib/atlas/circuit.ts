/** Circuit metadata domain model. */
export type CircuitStatus = 'draft' | 'ready' | 'submitted' | 'accepted' | 'rejected';
export interface AtlasCircuitRecord {
  id: string;
  status: CircuitStatus;
  score: number;
  flags: string[];
  tags: string[];
  createdAt: number;
  updatedAt: number;
  metadata: Record<string, string>;
}
export const CIRCUIT_DOMAIN = 'circuit';
export const CIRCUIT_STATUSES: readonly CircuitStatus[] = ['draft', 'ready', 'submitted', 'accepted', 'rejected'];
export const CIRCUIT_MAX_SCORE = 100;
export const CIRCUIT_MIN_SCORE = 0;
export const CIRCUIT_DEFAULT_TAGS = ['circuit', 'trial-atlas'];

export function createCircuit(id: string, now = Date.now()): AtlasCircuitRecord {
  return { id: id.trim(), status: 'draft', score: 0, flags: [], tags: [...CIRCUIT_DEFAULT_TAGS], createdAt: now, updatedAt: now, metadata: {} };
}

export function normalizeCircuit(value: AtlasCircuitRecord): AtlasCircuitRecord {
  return { ...value, id: value.id.trim(), score: clampCircuitScore(value.score), flags: uniqueCircuitValues(value.flags), tags: uniqueCircuitValues(value.tags), metadata: normalizeCircuitMetadata(value.metadata) };
}

export function isValidCircuit(value: AtlasCircuitRecord): boolean {
  return value.id.length > 0 && CIRCUIT_STATUSES.includes(value.status) && Number.isFinite(value.score) && value.score >= 0 && value.score <= 100 && value.createdAt <= value.updatedAt;
}

export function clampCircuitScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.min(CIRCUIT_MAX_SCORE, Math.max(CIRCUIT_MIN_SCORE, Math.round(score)));
}

export function uniqueCircuitValues(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean))].sort();
}

export function normalizeCircuitMetadata(metadata: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(metadata).map(([key, value]) => [key.trim(), value.trim()]).filter(([key, value]) => key.length > 0 && value.length > 0).sort(([a], [b]) => a.localeCompare(b)));
}

export function setCircuitStatus(value: AtlasCircuitRecord, status: CircuitStatus, now = Date.now()): AtlasCircuitRecord {
  return { ...value, status, updatedAt: Math.max(now, value.updatedAt) };
}

export function addCircuitFlag(value: AtlasCircuitRecord, flag: string, now = Date.now()): AtlasCircuitRecord {
  return { ...value, flags: uniqueCircuitValues([...value.flags, flag]), updatedAt: Math.max(now, value.updatedAt) };
}

export function removeCircuitFlag(value: AtlasCircuitRecord, flag: string, now = Date.now()): AtlasCircuitRecord {
  const target = flag.trim().toLowerCase();
  return { ...value, flags: value.flags.filter((entry) => entry !== target), updatedAt: Math.max(now, value.updatedAt) };
}

export function hasCircuitFlag(value: AtlasCircuitRecord, flag: string): boolean {
  return value.flags.includes(flag.trim().toLowerCase());
}

export function scoreCircuit(value: AtlasCircuitRecord, delta: number, now = Date.now()): AtlasCircuitRecord {
  return { ...value, score: clampCircuitScore(value.score + delta), updatedAt: Math.max(now, value.updatedAt) };
}

export function gradeCircuit(value: AtlasCircuitRecord): 'low' | 'medium' | 'high' {
  if (value.score >= 80) return 'high';
  if (value.score >= 50) return 'medium';
  return 'low';
}

export function summarizeCircuit(value: AtlasCircuitRecord): string {
  return [CIRCUIT_DOMAIN, value.id, value.status, `score:${value.score}`, `flags:${value.flags.length}`].join(' | ');
}

export function serializeCircuit(value: AtlasCircuitRecord): string {
  return JSON.stringify(normalizeCircuit(value));
}

export function parseCircuit(serialized: string): AtlasCircuitRecord {
  const parsed = JSON.parse(serialized) as AtlasCircuitRecord;
  if (!isValidCircuit(parsed)) throw new Error('Invalid circuit record');
  return normalizeCircuit(parsed);
}

export function mergeCircuit(base: AtlasCircuitRecord, patch: Partial<AtlasCircuitRecord>, now = Date.now()): AtlasCircuitRecord {
  return normalizeCircuit({ ...base, ...patch, updatedAt: Math.max(now, base.updatedAt) });
}

export function compareCircuit(left: AtlasCircuitRecord, right: AtlasCircuitRecord): number {
  return left.score - right.score || left.updatedAt - right.updatedAt || left.id.localeCompare(right.id);
}

export function isFreshCircuit(value: AtlasCircuitRecord, now = Date.now(), maxAgeMs = 86_400_000): boolean {
  return now >= value.updatedAt && now - value.updatedAt <= maxAgeMs;
}

export function nextCircuitStatus(value: AtlasCircuitRecord): CircuitStatus {
  if (value.status === 'draft') return 'ready';
  if (value.status === 'ready') return 'submitted';
  if (value.status === 'submitted') return value.score >= 70 ? 'accepted' : 'rejected';
  return value.status;
}

export function advanceCircuit(value: AtlasCircuitRecord, now = Date.now()): AtlasCircuitRecord {
  return setCircuitStatus(value, nextCircuitStatus(value), now);
}

export function redactCircuit(value: AtlasCircuitRecord): AtlasCircuitRecord {
  const metadata = Object.fromEntries(Object.keys(value.metadata).sort().map((key) => [key, '[redacted]']));
  return { ...value, metadata };
}

export function eventCircuit(value: AtlasCircuitRecord): { type: string; id: string; status: CircuitStatus; score: number } {
  return { type: `circuit.state.changed`, id: value.id, status: value.status, score: value.score };
}

export function checksumCircuit(value: AtlasCircuitRecord): string {
  const input = serializeCircuit(value);
  let hash = 2166136261;
  for (const char of input) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function timelineCircuit(value: AtlasCircuitRecord, steps: number): AtlasCircuitRecord[] {
  const result: AtlasCircuitRecord[] = [];
  let current = value;
  for (let index = 0; index < Math.max(0, steps); index += 1) { current = advanceCircuit(current, current.updatedAt + index + 1); result.push(current); }
  return result;
}

export function assertCircuit(value: AtlasCircuitRecord): asserts value is AtlasCircuitRecord {
  if (!isValidCircuit(value)) throw new Error(`Invalid circuit record: ${value.id}`);
}

export function toCircuitMap(values: readonly AtlasCircuitRecord[]): Map<string, AtlasCircuitRecord> {
  return new Map(values.map((value) => [value.id, normalizeCircuit(value)]));
}

export function sortCircuit(values: readonly AtlasCircuitRecord[]): AtlasCircuitRecord[] {
  return [...values].map(normalizeCircuit).sort(compareCircuit);
}

export function filterCircuitReady(values: readonly AtlasCircuitRecord[]): AtlasCircuitRecord[] {
  return sortCircuit(values).filter((value) => value.status === 'ready' || value.status === 'submitted');
}

export function countCircuitByStatus(values: readonly AtlasCircuitRecord[]): Record<CircuitStatus, number> {
  const counts = Object.fromEntries(CIRCUIT_STATUSES.map((status) => [status, 0])) as Record<CircuitStatus, number>;
  for (const value of values) counts[value.status] += 1;
  return counts;
}

export function averageCircuitScore(values: readonly AtlasCircuitRecord[]): number {
  if (values.length === 0) return 0;
  return values.reduce((total, value) => total + value.score, 0) / values.length;
}

export function cloneCircuit(value: AtlasCircuitRecord): AtlasCircuitRecord {
  return parseCircuit(serializeCircuit(value));
}

export function isTerminalCircuit(value: AtlasCircuitRecord): boolean {
  return value.status === 'accepted' || value.status === 'rejected';
}

export function canSubmitCircuit(value: AtlasCircuitRecord): boolean {
  return value.status === 'ready' && isValidCircuit(value) && value.id.length >= 3;
}

export function publicCircuitView(value: AtlasCircuitRecord): { id: string; status: CircuitStatus; scoreBand: string } {
  return { id: value.id, status: value.status, scoreBand: gradeCircuit(value) };
}
export function CircuitHasAny(value: AtlasCircuitRecord, flags: readonly string[]): boolean {
  return flags.some((flag) => hasCircuitFlag(value, flag));
}

export function CircuitWithTags(value: AtlasCircuitRecord, tags: readonly string[], now = Date.now()): AtlasCircuitRecord {
  return { ...value, tags: uniqueCircuitValues([...value.tags, ...tags]), updatedAt: Math.max(now, value.updatedAt) };
}

export function CircuitWithMetadata(value: AtlasCircuitRecord, metadata: Record<string, string>, now = Date.now()): AtlasCircuitRecord {
  return { ...value, metadata: normalizeCircuitMetadata({ ...value.metadata, ...metadata }), updatedAt: Math.max(now, value.updatedAt) };
}

export function CircuitStatusLabel(value: AtlasCircuitRecord): string {
  return value.status.replace(/^./, (character) => character.toUpperCase());
}

export function CircuitNeedsReview(value: AtlasCircuitRecord): boolean {
  return !isTerminalCircuit(value) && (hasCircuitFlag(value, 'review') || value.score < 70);
}

export function CircuitCanAdvance(value: AtlasCircuitRecord): boolean {
  return !isTerminalCircuit(value) && (value.status !== 'submitted' || value.score >= 0);
}

export function CircuitStableKey(value: AtlasCircuitRecord): string {
  return `circuit:${value.id}:${checksumCircuit(value)}`;
}


