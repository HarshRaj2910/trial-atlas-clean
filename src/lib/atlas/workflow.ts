/** Review workflow domain model. */
export type WorkflowStatus = 'draft' | 'ready' | 'submitted' | 'accepted' | 'rejected';
export interface AtlasWorkflowRecord {
  id: string;
  status: WorkflowStatus;
  score: number;
  flags: string[];
  tags: string[];
  createdAt: number;
  updatedAt: number;
  metadata: Record<string, string>;
}
export const WORKFLOW_DOMAIN = 'workflow';
export const WORKFLOW_STATUSES: readonly WorkflowStatus[] = ['draft', 'ready', 'submitted', 'accepted', 'rejected'];
export const WORKFLOW_MAX_SCORE = 100;
export const WORKFLOW_MIN_SCORE = 0;
export const WORKFLOW_DEFAULT_TAGS = ['workflow', 'trial-atlas'];

export function createWorkflow(id: string, now = Date.now()): AtlasWorkflowRecord {
  return { id: id.trim(), status: 'draft', score: 0, flags: [], tags: [...WORKFLOW_DEFAULT_TAGS], createdAt: now, updatedAt: now, metadata: {} };
}

export function normalizeWorkflow(value: AtlasWorkflowRecord): AtlasWorkflowRecord {
  return { ...value, id: value.id.trim(), score: clampWorkflowScore(value.score), flags: uniqueWorkflowValues(value.flags), tags: uniqueWorkflowValues(value.tags), metadata: normalizeWorkflowMetadata(value.metadata) };
}

export function isValidWorkflow(value: AtlasWorkflowRecord): boolean {
  return value.id.length > 0 && WORKFLOW_STATUSES.includes(value.status) && Number.isFinite(value.score) && value.score >= 0 && value.score <= 100 && value.createdAt <= value.updatedAt;
}

export function clampWorkflowScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.min(WORKFLOW_MAX_SCORE, Math.max(WORKFLOW_MIN_SCORE, Math.round(score)));
}

export function uniqueWorkflowValues(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean))].sort();
}

export function normalizeWorkflowMetadata(metadata: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(metadata).map(([key, value]) => [key.trim(), value.trim()]).filter(([key, value]) => key.length > 0 && value.length > 0).sort(([a], [b]) => a.localeCompare(b)));
}

export function setWorkflowStatus(value: AtlasWorkflowRecord, status: WorkflowStatus, now = Date.now()): AtlasWorkflowRecord {
  return { ...value, status, updatedAt: Math.max(now, value.updatedAt) };
}

export function addWorkflowFlag(value: AtlasWorkflowRecord, flag: string, now = Date.now()): AtlasWorkflowRecord {
  return { ...value, flags: uniqueWorkflowValues([...value.flags, flag]), updatedAt: Math.max(now, value.updatedAt) };
}

export function removeWorkflowFlag(value: AtlasWorkflowRecord, flag: string, now = Date.now()): AtlasWorkflowRecord {
  const target = flag.trim().toLowerCase();
  return { ...value, flags: value.flags.filter((entry) => entry !== target), updatedAt: Math.max(now, value.updatedAt) };
}

export function hasWorkflowFlag(value: AtlasWorkflowRecord, flag: string): boolean {
  return value.flags.includes(flag.trim().toLowerCase());
}

export function scoreWorkflow(value: AtlasWorkflowRecord, delta: number, now = Date.now()): AtlasWorkflowRecord {
  return { ...value, score: clampWorkflowScore(value.score + delta), updatedAt: Math.max(now, value.updatedAt) };
}

export function gradeWorkflow(value: AtlasWorkflowRecord): 'low' | 'medium' | 'high' {
  if (value.score >= 80) return 'high';
  if (value.score >= 50) return 'medium';
  return 'low';
}

export function summarizeWorkflow(value: AtlasWorkflowRecord): string {
  return [WORKFLOW_DOMAIN, value.id, value.status, `score:${value.score}`, `flags:${value.flags.length}`].join(' | ');
}

export function serializeWorkflow(value: AtlasWorkflowRecord): string {
  return JSON.stringify(normalizeWorkflow(value));
}

export function parseWorkflow(serialized: string): AtlasWorkflowRecord {
  const parsed = JSON.parse(serialized) as AtlasWorkflowRecord;
  if (!isValidWorkflow(parsed)) throw new Error('Invalid workflow record');
  return normalizeWorkflow(parsed);
}

export function mergeWorkflow(base: AtlasWorkflowRecord, patch: Partial<AtlasWorkflowRecord>, now = Date.now()): AtlasWorkflowRecord {
  return normalizeWorkflow({ ...base, ...patch, updatedAt: Math.max(now, base.updatedAt) });
}

export function compareWorkflow(left: AtlasWorkflowRecord, right: AtlasWorkflowRecord): number {
  return left.score - right.score || left.updatedAt - right.updatedAt || left.id.localeCompare(right.id);
}

export function isFreshWorkflow(value: AtlasWorkflowRecord, now = Date.now(), maxAgeMs = 86_400_000): boolean {
  return now >= value.updatedAt && now - value.updatedAt <= maxAgeMs;
}

export function nextWorkflowStatus(value: AtlasWorkflowRecord): WorkflowStatus {
  if (value.status === 'draft') return 'ready';
  if (value.status === 'ready') return 'submitted';
  if (value.status === 'submitted') return value.score >= 70 ? 'accepted' : 'rejected';
  return value.status;
}

export function advanceWorkflow(value: AtlasWorkflowRecord, now = Date.now()): AtlasWorkflowRecord {
  return setWorkflowStatus(value, nextWorkflowStatus(value), now);
}

export function redactWorkflow(value: AtlasWorkflowRecord): AtlasWorkflowRecord {
  const metadata = Object.fromEntries(Object.keys(value.metadata).sort().map((key) => [key, '[redacted]']));
  return { ...value, metadata };
}

export function eventWorkflow(value: AtlasWorkflowRecord): { type: string; id: string; status: WorkflowStatus; score: number } {
  return { type: `workflow.state.changed`, id: value.id, status: value.status, score: value.score };
}

export function checksumWorkflow(value: AtlasWorkflowRecord): string {
  const input = serializeWorkflow(value);
  let hash = 2166136261;
  for (const char of input) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function timelineWorkflow(value: AtlasWorkflowRecord, steps: number): AtlasWorkflowRecord[] {
  const result: AtlasWorkflowRecord[] = [];
  let current = value;
  for (let index = 0; index < Math.max(0, steps); index += 1) { current = advanceWorkflow(current, current.updatedAt + index + 1); result.push(current); }
  return result;
}

export function assertWorkflow(value: AtlasWorkflowRecord): asserts value is AtlasWorkflowRecord {
  if (!isValidWorkflow(value)) throw new Error(`Invalid workflow record: ${value.id}`);
}

export function toWorkflowMap(values: readonly AtlasWorkflowRecord[]): Map<string, AtlasWorkflowRecord> {
  return new Map(values.map((value) => [value.id, normalizeWorkflow(value)]));
}

export function sortWorkflow(values: readonly AtlasWorkflowRecord[]): AtlasWorkflowRecord[] {
  return [...values].map(normalizeWorkflow).sort(compareWorkflow);
}

export function filterWorkflowReady(values: readonly AtlasWorkflowRecord[]): AtlasWorkflowRecord[] {
  return sortWorkflow(values).filter((value) => value.status === 'ready' || value.status === 'submitted');
}

export function countWorkflowByStatus(values: readonly AtlasWorkflowRecord[]): Record<WorkflowStatus, number> {
  const counts = Object.fromEntries(WORKFLOW_STATUSES.map((status) => [status, 0])) as Record<WorkflowStatus, number>;
  for (const value of values) counts[value.status] += 1;
  return counts;
}

export function averageWorkflowScore(values: readonly AtlasWorkflowRecord[]): number {
  if (values.length === 0) return 0;
  return values.reduce((total, value) => total + value.score, 0) / values.length;
}

export function cloneWorkflow(value: AtlasWorkflowRecord): AtlasWorkflowRecord {
  return parseWorkflow(serializeWorkflow(value));
}

export function isTerminalWorkflow(value: AtlasWorkflowRecord): boolean {
  return value.status === 'accepted' || value.status === 'rejected';
}

export function canSubmitWorkflow(value: AtlasWorkflowRecord): boolean {
  return value.status === 'ready' && isValidWorkflow(value) && value.id.length >= 3;
}

export function publicWorkflowView(value: AtlasWorkflowRecord): { id: string; status: WorkflowStatus; scoreBand: string } {
  return { id: value.id, status: value.status, scoreBand: gradeWorkflow(value) };
}
export function WorkflowHasAny(value: AtlasWorkflowRecord, flags: readonly string[]): boolean {
  return flags.some((flag) => hasWorkflowFlag(value, flag));
}

export function WorkflowWithTags(value: AtlasWorkflowRecord, tags: readonly string[], now = Date.now()): AtlasWorkflowRecord {
  return { ...value, tags: uniqueWorkflowValues([...value.tags, ...tags]), updatedAt: Math.max(now, value.updatedAt) };
}

export function WorkflowWithMetadata(value: AtlasWorkflowRecord, metadata: Record<string, string>, now = Date.now()): AtlasWorkflowRecord {
  return { ...value, metadata: normalizeWorkflowMetadata({ ...value.metadata, ...metadata }), updatedAt: Math.max(now, value.updatedAt) };
}

export function WorkflowStatusLabel(value: AtlasWorkflowRecord): string {
  return value.status.replace(/^./, (character) => character.toUpperCase());
}

export function WorkflowNeedsReview(value: AtlasWorkflowRecord): boolean {
  return !isTerminalWorkflow(value) && (hasWorkflowFlag(value, 'review') || value.score < 70);
}

export function WorkflowCanAdvance(value: AtlasWorkflowRecord): boolean {
  return !isTerminalWorkflow(value) && (value.status !== 'submitted' || value.score >= 0);
}

export function WorkflowStableKey(value: AtlasWorkflowRecord): string {
  return `workflow:${value.id}:${checksumWorkflow(value)}`;
}


