/** Accessible status projection domain model. */
export type AccessibilityStatus = 'draft' | 'ready' | 'submitted' | 'accepted' | 'rejected';
export interface AtlasAccessibilityRecord {
  id: string;
  status: AccessibilityStatus;
  score: number;
  flags: string[];
  tags: string[];
  createdAt: number;
  updatedAt: number;
  metadata: Record<string, string>;
}
export const ACCESSIBILITY_DOMAIN = 'accessibility';
export const ACCESSIBILITY_STATUSES: readonly AccessibilityStatus[] = ['draft', 'ready', 'submitted', 'accepted', 'rejected'];
export const ACCESSIBILITY_MAX_SCORE = 100;
export const ACCESSIBILITY_MIN_SCORE = 0;
export const ACCESSIBILITY_DEFAULT_TAGS = ['accessibility', 'trial-atlas'];

export function createAccessibility(id: string, now = Date.now()): AtlasAccessibilityRecord {
  return { id: id.trim(), status: 'draft', score: 0, flags: [], tags: [...ACCESSIBILITY_DEFAULT_TAGS], createdAt: now, updatedAt: now, metadata: {} };
}

export function normalizeAccessibility(value: AtlasAccessibilityRecord): AtlasAccessibilityRecord {
  return { ...value, id: value.id.trim(), score: clampAccessibilityScore(value.score), flags: uniqueAccessibilityValues(value.flags), tags: uniqueAccessibilityValues(value.tags), metadata: normalizeAccessibilityMetadata(value.metadata) };
}

export function isValidAccessibility(value: AtlasAccessibilityRecord): boolean {
  return value.id.length > 0 && ACCESSIBILITY_STATUSES.includes(value.status) && Number.isFinite(value.score) && value.score >= 0 && value.score <= 100 && value.createdAt <= value.updatedAt;
}

export function clampAccessibilityScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.min(ACCESSIBILITY_MAX_SCORE, Math.max(ACCESSIBILITY_MIN_SCORE, Math.round(score)));
}

export function uniqueAccessibilityValues(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean))].sort();
}

export function normalizeAccessibilityMetadata(metadata: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(metadata).map(([key, value]) => [key.trim(), value.trim()]).filter(([key, value]) => key.length > 0 && value.length > 0).sort(([a], [b]) => a.localeCompare(b)));
}

export function setAccessibilityStatus(value: AtlasAccessibilityRecord, status: AccessibilityStatus, now = Date.now()): AtlasAccessibilityRecord {
  return { ...value, status, updatedAt: Math.max(now, value.updatedAt) };
}

export function addAccessibilityFlag(value: AtlasAccessibilityRecord, flag: string, now = Date.now()): AtlasAccessibilityRecord {
  return { ...value, flags: uniqueAccessibilityValues([...value.flags, flag]), updatedAt: Math.max(now, value.updatedAt) };
}

export function removeAccessibilityFlag(value: AtlasAccessibilityRecord, flag: string, now = Date.now()): AtlasAccessibilityRecord {
  const target = flag.trim().toLowerCase();
  return { ...value, flags: value.flags.filter((entry) => entry !== target), updatedAt: Math.max(now, value.updatedAt) };
}

export function hasAccessibilityFlag(value: AtlasAccessibilityRecord, flag: string): boolean {
  return value.flags.includes(flag.trim().toLowerCase());
}

export function scoreAccessibility(value: AtlasAccessibilityRecord, delta: number, now = Date.now()): AtlasAccessibilityRecord {
  return { ...value, score: clampAccessibilityScore(value.score + delta), updatedAt: Math.max(now, value.updatedAt) };
}

export function gradeAccessibility(value: AtlasAccessibilityRecord): 'low' | 'medium' | 'high' {
  if (value.score >= 80) return 'high';
  if (value.score >= 50) return 'medium';
  return 'low';
}

export function summarizeAccessibility(value: AtlasAccessibilityRecord): string {
  return [ACCESSIBILITY_DOMAIN, value.id, value.status, `score:${value.score}`, `flags:${value.flags.length}`].join(' | ');
}

export function serializeAccessibility(value: AtlasAccessibilityRecord): string {
  return JSON.stringify(normalizeAccessibility(value));
}

export function parseAccessibility(serialized: string): AtlasAccessibilityRecord {
  const parsed = JSON.parse(serialized) as AtlasAccessibilityRecord;
  if (!isValidAccessibility(parsed)) throw new Error('Invalid accessibility record');
  return normalizeAccessibility(parsed);
}

export function mergeAccessibility(base: AtlasAccessibilityRecord, patch: Partial<AtlasAccessibilityRecord>, now = Date.now()): AtlasAccessibilityRecord {
  return normalizeAccessibility({ ...base, ...patch, updatedAt: Math.max(now, base.updatedAt) });
}

export function compareAccessibility(left: AtlasAccessibilityRecord, right: AtlasAccessibilityRecord): number {
  return left.score - right.score || left.updatedAt - right.updatedAt || left.id.localeCompare(right.id);
}

export function isFreshAccessibility(value: AtlasAccessibilityRecord, now = Date.now(), maxAgeMs = 86_400_000): boolean {
  return now >= value.updatedAt && now - value.updatedAt <= maxAgeMs;
}

export function nextAccessibilityStatus(value: AtlasAccessibilityRecord): AccessibilityStatus {
  if (value.status === 'draft') return 'ready';
  if (value.status === 'ready') return 'submitted';
  if (value.status === 'submitted') return value.score >= 70 ? 'accepted' : 'rejected';
  return value.status;
}

export function advanceAccessibility(value: AtlasAccessibilityRecord, now = Date.now()): AtlasAccessibilityRecord {
  return setAccessibilityStatus(value, nextAccessibilityStatus(value), now);
}

export function redactAccessibility(value: AtlasAccessibilityRecord): AtlasAccessibilityRecord {
  const metadata = Object.fromEntries(Object.keys(value.metadata).sort().map((key) => [key, '[redacted]']));
  return { ...value, metadata };
}

export function eventAccessibility(value: AtlasAccessibilityRecord): { type: string; id: string; status: AccessibilityStatus; score: number } {
  return { type: `accessibility.state.changed`, id: value.id, status: value.status, score: value.score };
}

export function checksumAccessibility(value: AtlasAccessibilityRecord): string {
  const input = serializeAccessibility(value);
  let hash = 2166136261;
  for (const char of input) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function timelineAccessibility(value: AtlasAccessibilityRecord, steps: number): AtlasAccessibilityRecord[] {
  const result: AtlasAccessibilityRecord[] = [];
  let current = value;
  for (let index = 0; index < Math.max(0, steps); index += 1) { current = advanceAccessibility(current, current.updatedAt + index + 1); result.push(current); }
  return result;
}

export function assertAccessibility(value: AtlasAccessibilityRecord): asserts value is AtlasAccessibilityRecord {
  if (!isValidAccessibility(value)) throw new Error(`Invalid accessibility record: ${value.id}`);
}

export function toAccessibilityMap(values: readonly AtlasAccessibilityRecord[]): Map<string, AtlasAccessibilityRecord> {
  return new Map(values.map((value) => [value.id, normalizeAccessibility(value)]));
}

export function sortAccessibility(values: readonly AtlasAccessibilityRecord[]): AtlasAccessibilityRecord[] {
  return [...values].map(normalizeAccessibility).sort(compareAccessibility);
}

export function filterAccessibilityReady(values: readonly AtlasAccessibilityRecord[]): AtlasAccessibilityRecord[] {
  return sortAccessibility(values).filter((value) => value.status === 'ready' || value.status === 'submitted');
}

export function countAccessibilityByStatus(values: readonly AtlasAccessibilityRecord[]): Record<AccessibilityStatus, number> {
  const counts = Object.fromEntries(ACCESSIBILITY_STATUSES.map((status) => [status, 0])) as Record<AccessibilityStatus, number>;
  for (const value of values) counts[value.status] += 1;
  return counts;
}

export function averageAccessibilityScore(values: readonly AtlasAccessibilityRecord[]): number {
  if (values.length === 0) return 0;
  return values.reduce((total, value) => total + value.score, 0) / values.length;
}

export function cloneAccessibility(value: AtlasAccessibilityRecord): AtlasAccessibilityRecord {
  return parseAccessibility(serializeAccessibility(value));
}

export function isTerminalAccessibility(value: AtlasAccessibilityRecord): boolean {
  return value.status === 'accepted' || value.status === 'rejected';
}

export function canSubmitAccessibility(value: AtlasAccessibilityRecord): boolean {
  return value.status === 'ready' && isValidAccessibility(value) && value.id.length >= 3;
}

export function publicAccessibilityView(value: AtlasAccessibilityRecord): { id: string; status: AccessibilityStatus; scoreBand: string } {
  return { id: value.id, status: value.status, scoreBand: gradeAccessibility(value) };
}
export function AccessibilityHasAny(value: AtlasAccessibilityRecord, flags: readonly string[]): boolean {
  return flags.some((flag) => hasAccessibilityFlag(value, flag));
}

export function AccessibilityWithTags(value: AtlasAccessibilityRecord, tags: readonly string[], now = Date.now()): AtlasAccessibilityRecord {
  return { ...value, tags: uniqueAccessibilityValues([...value.tags, ...tags]), updatedAt: Math.max(now, value.updatedAt) };
}

export function AccessibilityWithMetadata(value: AtlasAccessibilityRecord, metadata: Record<string, string>, now = Date.now()): AtlasAccessibilityRecord {
  return { ...value, metadata: normalizeAccessibilityMetadata({ ...value.metadata, ...metadata }), updatedAt: Math.max(now, value.updatedAt) };
}

export function AccessibilityStatusLabel(value: AtlasAccessibilityRecord): string {
  return value.status.replace(/^./, (character) => character.toUpperCase());
}

export function AccessibilityNeedsReview(value: AtlasAccessibilityRecord): boolean {
  return !isTerminalAccessibility(value) && (hasAccessibilityFlag(value, 'review') || value.score < 70);
}

export function AccessibilityCanAdvance(value: AtlasAccessibilityRecord): boolean {
  return !isTerminalAccessibility(value) && (value.status !== 'submitted' || value.score >= 0);
}

export function AccessibilityStableKey(value: AtlasAccessibilityRecord): string {
  return `accessibility:${value.id}:${checksumAccessibility(value)}`;
}


