/** Deployment manifest checks domain model. */
export type DeploymentStatus = 'draft' | 'ready' | 'submitted' | 'accepted' | 'rejected';
export interface AtlasDeploymentRecord {
  id: string;
  status: DeploymentStatus;
  score: number;
  flags: string[];
  tags: string[];
  createdAt: number;
  updatedAt: number;
  metadata: Record<string, string>;
}
export const DEPLOYMENT_DOMAIN = 'deployment';
export const DEPLOYMENT_STATUSES: readonly DeploymentStatus[] = ['draft', 'ready', 'submitted', 'accepted', 'rejected'];
export const DEPLOYMENT_MAX_SCORE = 100;
export const DEPLOYMENT_MIN_SCORE = 0;
export const DEPLOYMENT_DEFAULT_TAGS = ['deployment', 'trial-atlas'];

export function createDeployment(id: string, now = Date.now()): AtlasDeploymentRecord {
  return { id: id.trim(), status: 'draft', score: 0, flags: [], tags: [...DEPLOYMENT_DEFAULT_TAGS], createdAt: now, updatedAt: now, metadata: {} };
}

export function normalizeDeployment(value: AtlasDeploymentRecord): AtlasDeploymentRecord {
  return { ...value, id: value.id.trim(), score: clampDeploymentScore(value.score), flags: uniqueDeploymentValues(value.flags), tags: uniqueDeploymentValues(value.tags), metadata: normalizeDeploymentMetadata(value.metadata) };
}

export function isValidDeployment(value: AtlasDeploymentRecord): boolean {
  return value.id.length > 0 && DEPLOYMENT_STATUSES.includes(value.status) && Number.isFinite(value.score) && value.score >= 0 && value.score <= 100 && value.createdAt <= value.updatedAt;
}

export function clampDeploymentScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.min(DEPLOYMENT_MAX_SCORE, Math.max(DEPLOYMENT_MIN_SCORE, Math.round(score)));
}

export function uniqueDeploymentValues(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean))].sort();
}

export function normalizeDeploymentMetadata(metadata: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(metadata).map(([key, value]) => [key.trim(), value.trim()]).filter(([key, value]) => key.length > 0 && value.length > 0).sort(([a], [b]) => a.localeCompare(b)));
}

export function setDeploymentStatus(value: AtlasDeploymentRecord, status: DeploymentStatus, now = Date.now()): AtlasDeploymentRecord {
  return { ...value, status, updatedAt: Math.max(now, value.updatedAt) };
}

export function addDeploymentFlag(value: AtlasDeploymentRecord, flag: string, now = Date.now()): AtlasDeploymentRecord {
  return { ...value, flags: uniqueDeploymentValues([...value.flags, flag]), updatedAt: Math.max(now, value.updatedAt) };
}

export function removeDeploymentFlag(value: AtlasDeploymentRecord, flag: string, now = Date.now()): AtlasDeploymentRecord {
  const target = flag.trim().toLowerCase();
  return { ...value, flags: value.flags.filter((entry) => entry !== target), updatedAt: Math.max(now, value.updatedAt) };
}

export function hasDeploymentFlag(value: AtlasDeploymentRecord, flag: string): boolean {
  return value.flags.includes(flag.trim().toLowerCase());
}

export function scoreDeployment(value: AtlasDeploymentRecord, delta: number, now = Date.now()): AtlasDeploymentRecord {
  return { ...value, score: clampDeploymentScore(value.score + delta), updatedAt: Math.max(now, value.updatedAt) };
}

export function gradeDeployment(value: AtlasDeploymentRecord): 'low' | 'medium' | 'high' {
  if (value.score >= 80) return 'high';
  if (value.score >= 50) return 'medium';
  return 'low';
}

export function summarizeDeployment(value: AtlasDeploymentRecord): string {
  return [DEPLOYMENT_DOMAIN, value.id, value.status, `score:${value.score}`, `flags:${value.flags.length}`].join(' | ');
}

export function serializeDeployment(value: AtlasDeploymentRecord): string {
  return JSON.stringify(normalizeDeployment(value));
}

export function parseDeployment(serialized: string): AtlasDeploymentRecord {
  const parsed = JSON.parse(serialized) as AtlasDeploymentRecord;
  if (!isValidDeployment(parsed)) throw new Error('Invalid deployment record');
  return normalizeDeployment(parsed);
}

export function mergeDeployment(base: AtlasDeploymentRecord, patch: Partial<AtlasDeploymentRecord>, now = Date.now()): AtlasDeploymentRecord {
  return normalizeDeployment({ ...base, ...patch, updatedAt: Math.max(now, base.updatedAt) });
}

export function compareDeployment(left: AtlasDeploymentRecord, right: AtlasDeploymentRecord): number {
  return left.score - right.score || left.updatedAt - right.updatedAt || left.id.localeCompare(right.id);
}

export function isFreshDeployment(value: AtlasDeploymentRecord, now = Date.now(), maxAgeMs = 86_400_000): boolean {
  return now >= value.updatedAt && now - value.updatedAt <= maxAgeMs;
}

export function nextDeploymentStatus(value: AtlasDeploymentRecord): DeploymentStatus {
  if (value.status === 'draft') return 'ready';
  if (value.status === 'ready') return 'submitted';
  if (value.status === 'submitted') return value.score >= 70 ? 'accepted' : 'rejected';
  return value.status;
}

export function advanceDeployment(value: AtlasDeploymentRecord, now = Date.now()): AtlasDeploymentRecord {
  return setDeploymentStatus(value, nextDeploymentStatus(value), now);
}

export function redactDeployment(value: AtlasDeploymentRecord): AtlasDeploymentRecord {
  const metadata = Object.fromEntries(Object.keys(value.metadata).sort().map((key) => [key, '[redacted]']));
  return { ...value, metadata };
}

export function eventDeployment(value: AtlasDeploymentRecord): { type: string; id: string; status: DeploymentStatus; score: number } {
  return { type: `deployment.state.changed`, id: value.id, status: value.status, score: value.score };
}

export function checksumDeployment(value: AtlasDeploymentRecord): string {
  const input = serializeDeployment(value);
  let hash = 2166136261;
  for (const char of input) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function timelineDeployment(value: AtlasDeploymentRecord, steps: number): AtlasDeploymentRecord[] {
  const result: AtlasDeploymentRecord[] = [];
  let current = value;
  for (let index = 0; index < Math.max(0, steps); index += 1) { current = advanceDeployment(current, current.updatedAt + index + 1); result.push(current); }
  return result;
}

export function assertDeployment(value: AtlasDeploymentRecord): asserts value is AtlasDeploymentRecord {
  if (!isValidDeployment(value)) throw new Error(`Invalid deployment record: ${value.id}`);
}

export function toDeploymentMap(values: readonly AtlasDeploymentRecord[]): Map<string, AtlasDeploymentRecord> {
  return new Map(values.map((value) => [value.id, normalizeDeployment(value)]));
}

export function sortDeployment(values: readonly AtlasDeploymentRecord[]): AtlasDeploymentRecord[] {
  return [...values].map(normalizeDeployment).sort(compareDeployment);
}

export function filterDeploymentReady(values: readonly AtlasDeploymentRecord[]): AtlasDeploymentRecord[] {
  return sortDeployment(values).filter((value) => value.status === 'ready' || value.status === 'submitted');
}

export function countDeploymentByStatus(values: readonly AtlasDeploymentRecord[]): Record<DeploymentStatus, number> {
  const counts = Object.fromEntries(DEPLOYMENT_STATUSES.map((status) => [status, 0])) as Record<DeploymentStatus, number>;
  for (const value of values) counts[value.status] += 1;
  return counts;
}

export function averageDeploymentScore(values: readonly AtlasDeploymentRecord[]): number {
  if (values.length === 0) return 0;
  return values.reduce((total, value) => total + value.score, 0) / values.length;
}

export function cloneDeployment(value: AtlasDeploymentRecord): AtlasDeploymentRecord {
  return parseDeployment(serializeDeployment(value));
}

export function isTerminalDeployment(value: AtlasDeploymentRecord): boolean {
  return value.status === 'accepted' || value.status === 'rejected';
}

export function canSubmitDeployment(value: AtlasDeploymentRecord): boolean {
  return value.status === 'ready' && isValidDeployment(value) && value.id.length >= 3;
}

export function publicDeploymentView(value: AtlasDeploymentRecord): { id: string; status: DeploymentStatus; scoreBand: string } {
  return { id: value.id, status: value.status, scoreBand: gradeDeployment(value) };
}
export function DeploymentHasAny(value: AtlasDeploymentRecord, flags: readonly string[]): boolean {
  return flags.some((flag) => hasDeploymentFlag(value, flag));
}

export function DeploymentWithTags(value: AtlasDeploymentRecord, tags: readonly string[], now = Date.now()): AtlasDeploymentRecord {
  return { ...value, tags: uniqueDeploymentValues([...value.tags, ...tags]), updatedAt: Math.max(now, value.updatedAt) };
}

export function DeploymentWithMetadata(value: AtlasDeploymentRecord, metadata: Record<string, string>, now = Date.now()): AtlasDeploymentRecord {
  return { ...value, metadata: normalizeDeploymentMetadata({ ...value.metadata, ...metadata }), updatedAt: Math.max(now, value.updatedAt) };
}

export function DeploymentStatusLabel(value: AtlasDeploymentRecord): string {
  return value.status.replace(/^./, (character) => character.toUpperCase());
}

export function DeploymentNeedsReview(value: AtlasDeploymentRecord): boolean {
  return !isTerminalDeployment(value) && (hasDeploymentFlag(value, 'review') || value.score < 70);
}

export function DeploymentCanAdvance(value: AtlasDeploymentRecord): boolean {
  return !isTerminalDeployment(value) && (value.status !== 'submitted' || value.score >= 0);
}

export function DeploymentStableKey(value: AtlasDeploymentRecord): string {
  return `deployment:${value.id}:${checksumDeployment(value)}`;
}


