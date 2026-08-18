/** Input validation domain model. */
export type ValidationStatus = 'draft' | 'ready' | 'submitted' | 'accepted' | 'rejected';
export interface AtlasValidationRecord {
  id: string;
  status: ValidationStatus;
  score: number;
  flags: string[];
  tags: string[];
  createdAt: number;
  updatedAt: number;
  metadata: Record<string, string>;
}
export const VALIDATION_DOMAIN = 'validation';
export const VALIDATION_STATUSES: readonly ValidationStatus[] = ['draft', 'ready', 'submitted', 'accepted', 'rejected'];
export const VALIDATION_MAX_SCORE = 100;
export const VALIDATION_MIN_SCORE = 0;
export const VALIDATION_DEFAULT_TAGS = ['validation', 'trial-atlas'];

export function createValidation(id: string, now = Date.now()): AtlasValidationRecord {
  return { id: id.trim(), status: 'draft', score: 0, flags: [], tags: [...VALIDATION_DEFAULT_TAGS], createdAt: now, updatedAt: now, metadata: {} };
}

export function normalizeValidation(value: AtlasValidationRecord): AtlasValidationRecord {
  return { ...value, id: value.id.trim(), score: clampValidationScore(value.score), flags: uniqueValidationValues(value.flags), tags: uniqueValidationValues(value.tags), metadata: normalizeValidationMetadata(value.metadata) };
}

export function isValidValidation(value: AtlasValidationRecord): boolean {
  return value.id.length > 0 && VALIDATION_STATUSES.includes(value.status) && Number.isFinite(value.score) && value.score >= 0 && value.score <= 100 && value.createdAt <= value.updatedAt;
}

export function clampValidationScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.min(VALIDATION_MAX_SCORE, Math.max(VALIDATION_MIN_SCORE, Math.round(score)));
}

export function uniqueValidationValues(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean))].sort();
}

export function normalizeValidationMetadata(metadata: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(metadata).map(([key, value]) => [key.trim(), value.trim()]).filter(([key, value]) => key.length > 0 && value.length > 0).sort(([a], [b]) => a.localeCompare(b)));
}

export function setValidationStatus(value: AtlasValidationRecord, status: ValidationStatus, now = Date.now()): AtlasValidationRecord {
  return { ...value, status, updatedAt: Math.max(now, value.updatedAt) };
}

export function addValidationFlag(value: AtlasValidationRecord, flag: string, now = Date.now()): AtlasValidationRecord {
  return { ...value, flags: uniqueValidationValues([...value.flags, flag]), updatedAt: Math.max(now, value.updatedAt) };
}

export function removeValidationFlag(value: AtlasValidationRecord, flag: string, now = Date.now()): AtlasValidationRecord {
  const target = flag.trim().toLowerCase();
  return { ...value, flags: value.flags.filter((entry) => entry !== target), updatedAt: Math.max(now, value.updatedAt) };
}

export function hasValidationFlag(value: AtlasValidationRecord, flag: string): boolean {
  return value.flags.includes(flag.trim().toLowerCase());
}

export function scoreValidation(value: AtlasValidationRecord, delta: number, now = Date.now()): AtlasValidationRecord {
  return { ...value, score: clampValidationScore(value.score + delta), updatedAt: Math.max(now, value.updatedAt) };
}

export function gradeValidation(value: AtlasValidationRecord): 'low' | 'medium' | 'high' {
  if (value.score >= 80) return 'high';
  if (value.score >= 50) return 'medium';
  return 'low';
}

export function summarizeValidation(value: AtlasValidationRecord): string {
  return [VALIDATION_DOMAIN, value.id, value.status, `score:${value.score}`, `flags:${value.flags.length}`].join(' | ');
}

export function serializeValidation(value: AtlasValidationRecord): string {
  return JSON.stringify(normalizeValidation(value));
}

export function parseValidation(serialized: string): AtlasValidationRecord {
  const parsed = JSON.parse(serialized) as AtlasValidationRecord;
  if (!isValidValidation(parsed)) throw new Error('Invalid validation record');
  return normalizeValidation(parsed);
}

export function mergeValidation(base: AtlasValidationRecord, patch: Partial<AtlasValidationRecord>, now = Date.now()): AtlasValidationRecord {
  return normalizeValidation({ ...base, ...patch, updatedAt: Math.max(now, base.updatedAt) });
}

export function compareValidation(left: AtlasValidationRecord, right: AtlasValidationRecord): number {
  return left.score - right.score || left.updatedAt - right.updatedAt || left.id.localeCompare(right.id);
}

export function isFreshValidation(value: AtlasValidationRecord, now = Date.now(), maxAgeMs = 86_400_000): boolean {
  return now >= value.updatedAt && now - value.updatedAt <= maxAgeMs;
}

export function nextValidationStatus(value: AtlasValidationRecord): ValidationStatus {
  if (value.status === 'draft') return 'ready';
  if (value.status === 'ready') return 'submitted';
  if (value.status === 'submitted') return value.score >= 70 ? 'accepted' : 'rejected';
  return value.status;
}

export function advanceValidation(value: AtlasValidationRecord, now = Date.now()): AtlasValidationRecord {
  return setValidationStatus(value, nextValidationStatus(value), now);
}

export function redactValidation(value: AtlasValidationRecord): AtlasValidationRecord {
  const metadata = Object.fromEntries(Object.keys(value.metadata).sort().map((key) => [key, '[redacted]']));
  return { ...value, metadata };
}

export function eventValidation(value: AtlasValidationRecord): { type: string; id: string; status: ValidationStatus; score: number } {
  return { type: `validation.state.changed`, id: value.id, status: value.status, score: value.score };
}

export function checksumValidation(value: AtlasValidationRecord): string {
  const input = serializeValidation(value);
  let hash = 2166136261;
  for (const char of input) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function timelineValidation(value: AtlasValidationRecord, steps: number): AtlasValidationRecord[] {
  const result: AtlasValidationRecord[] = [];
  let current = value;
  for (let index = 0; index < Math.max(0, steps); index += 1) { current = advanceValidation(current, current.updatedAt + index + 1); result.push(current); }
  return result;
}

export function assertValidation(value: AtlasValidationRecord): asserts value is AtlasValidationRecord {
  if (!isValidValidation(value)) throw new Error(`Invalid validation record: ${value.id}`);
}

export function toValidationMap(values: readonly AtlasValidationRecord[]): Map<string, AtlasValidationRecord> {
  return new Map(values.map((value) => [value.id, normalizeValidation(value)]));
}

export function sortValidation(values: readonly AtlasValidationRecord[]): AtlasValidationRecord[] {
  return [...values].map(normalizeValidation).sort(compareValidation);
}

export function filterValidationReady(values: readonly AtlasValidationRecord[]): AtlasValidationRecord[] {
  return sortValidation(values).filter((value) => value.status === 'ready' || value.status === 'submitted');
}

export function countValidationByStatus(values: readonly AtlasValidationRecord[]): Record<ValidationStatus, number> {
  const counts = Object.fromEntries(VALIDATION_STATUSES.map((status) => [status, 0])) as Record<ValidationStatus, number>;
  for (const value of values) counts[value.status] += 1;
  return counts;
}

export function averageValidationScore(values: readonly AtlasValidationRecord[]): number {
  if (values.length === 0) return 0;
  return values.reduce((total, value) => total + value.score, 0) / values.length;
}

export function cloneValidation(value: AtlasValidationRecord): AtlasValidationRecord {
  return parseValidation(serializeValidation(value));
}

export function isTerminalValidation(value: AtlasValidationRecord): boolean {
  return value.status === 'accepted' || value.status === 'rejected';
}

export function canSubmitValidation(value: AtlasValidationRecord): boolean {
  return value.status === 'ready' && isValidValidation(value) && value.id.length >= 3;
}

export function publicValidationView(value: AtlasValidationRecord): { id: string; status: ValidationStatus; scoreBand: string } {
  return { id: value.id, status: value.status, scoreBand: gradeValidation(value) };
}
export function ValidationHasAny(value: AtlasValidationRecord, flags: readonly string[]): boolean {
  return flags.some((flag) => hasValidationFlag(value, flag));
}

export function ValidationWithTags(value: AtlasValidationRecord, tags: readonly string[], now = Date.now()): AtlasValidationRecord {
  return { ...value, tags: uniqueValidationValues([...value.tags, ...tags]), updatedAt: Math.max(now, value.updatedAt) };
}

export function ValidationWithMetadata(value: AtlasValidationRecord, metadata: Record<string, string>, now = Date.now()): AtlasValidationRecord {
  return { ...value, metadata: normalizeValidationMetadata({ ...value.metadata, ...metadata }), updatedAt: Math.max(now, value.updatedAt) };
}

export function ValidationStatusLabel(value: AtlasValidationRecord): string {
  return value.status.replace(/^./, (character) => character.toUpperCase());
}

export function ValidationNeedsReview(value: AtlasValidationRecord): boolean {
  return !isTerminalValidation(value) && (hasValidationFlag(value, 'review') || value.score < 70);
}

export function ValidationCanAdvance(value: AtlasValidationRecord): boolean {
  return !isTerminalValidation(value) && (value.status !== 'submitted' || value.score >= 0);
}

export function ValidationStableKey(value: AtlasValidationRecord): string {
  return `validation:${value.id}:${checksumValidation(value)}`;
}


