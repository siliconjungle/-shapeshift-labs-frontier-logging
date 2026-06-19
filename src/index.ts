import type { JsonObject } from '@shapeshift-labs/frontier/types';
import type {
  FrontierLogger,
  LogAttributesInput,
  LogLevelInput,
  LogRecord
} from './logging.js';

export * from './logging.js';

export const AUTONOMOUS_MERGE_WORKER_RECORD_NAME = 'agent.swarm.autonomous_merge.worker';
export const AUTONOMOUS_MERGE_LEASE_RECORD_NAME = 'agent.swarm.autonomous_merge.lease';
export const AUTONOMOUS_MERGE_GATE_RECORD_NAME = 'agent.swarm.autonomous_merge.gate';
export const AUTONOMOUS_MERGE_APPLY_RECORD_NAME = 'agent.swarm.autonomous_merge.apply';
export const AUTONOMOUS_MERGE_LANE_RECORD_NAME = 'agent.swarm.autonomous_merge.lane';
export const SEMANTIC_STREAM_RECORD_NAME_PREFIX = 'agent.swarm.semantic_stream';
const SEMANTIC_STREAM_INLINE_STRING_LIMIT = 128;
const SEMANTIC_STREAM_SUMMARY_PREFIX = 'semantic-stream-id:';

export type SemanticStreamEventKind =
  | 'slice.claimed'
  | 'slice.applied'
  | 'lease.acquired'
  | 'lease.released'
  | 'merge.promoted'
  | 'merge.superseded';

export interface SemanticStreamTelemetry extends JsonObject {
  kind: SemanticStreamEventKind;
  semanticRegionKey?: string;
  semanticRegionKeys?: string[];
  sourceHead?: string;
  sourceHeads?: string[];
  currentHead?: string;
  currentHeads?: string[];
  taskId?: string;
  taskIds?: string[];
  leaseKey?: string;
  leaseKeys?: string[];
  leaseId?: string;
  sliceId?: string;
  mergeId?: string;
  promotionParent?: string;
  promotionParents?: string[];
  supersedingMergeId?: string;
}

export interface SemanticStreamTelemetryInput {
  kind: SemanticStreamEventKind;
  semanticRegionKey?: string;
  semanticRegionKeys?: string[];
  sourceHead?: string;
  sourceHeads?: string[];
  currentHead?: string;
  currentHeads?: string[];
  taskId?: string;
  taskIds?: string[];
  leaseKey?: string;
  leaseKeys?: string[];
  leaseId?: string;
  sliceId?: string;
  mergeId?: string;
  promotionParent?: string;
  promotionParents?: string[];
  supersedingMergeId?: string;
}

export interface AutonomousMergeWorkerTelemetry extends JsonObject {
  kind: 'autonomous-merge-worker';
  workerId: string;
  status: string;
  lane?: string;
  coordinatorId?: string;
  leaseId?: string;
  phase?: string;
  attempt?: number;
  queueDepth?: number;
  activeCount?: number;
  completedCount?: number;
  failedCount?: number;
  rerunCount?: number;
  durationMs?: number;
  reasonCode?: string;
}

export interface AutonomousMergeWorkerTelemetryInput {
  workerId: string;
  status: string;
  lane?: string;
  coordinatorId?: string;
  leaseId?: string;
  phase?: string;
  attempt?: number;
  queueDepth?: number;
  activeCount?: number;
  completedCount?: number;
  failedCount?: number;
  rerunCount?: number;
  durationMs?: number;
  reasonCode?: string;
}

export interface AutonomousMergeLeaseTelemetry extends JsonObject {
  kind: 'autonomous-merge-lease';
  leaseId: string;
  state: string;
  coordinatorId?: string;
  lane?: string;
  leaseAgeMs?: number;
  expiresInMs?: number;
  renewCount?: number;
  durationMs?: number;
  reasonCode?: string;
}

export interface AutonomousMergeLeaseTelemetryInput {
  leaseId: string;
  state: string;
  coordinatorId?: string;
  lane?: string;
  leaseAgeMs?: number;
  expiresInMs?: number;
  renewCount?: number;
  durationMs?: number;
  reasonCode?: string;
}

export interface AutonomousMergeGateTelemetry extends JsonObject {
  kind: 'autonomous-merge-gate';
  gateId: string;
  result: string;
  lane?: string;
  checkedCount?: number;
  passedCount?: number;
  failedCount?: number;
  blockedCount?: number;
  durationMs?: number;
  failureClass?: string;
  reasonCode?: string;
}

export interface AutonomousMergeGateTelemetryInput {
  gateId: string;
  result: string;
  lane?: string;
  checkedCount?: number;
  passedCount?: number;
  failedCount?: number;
  blockedCount?: number;
  durationMs?: number;
  failureClass?: string;
  reasonCode?: string;
}

export interface AutonomousMergeApplyTelemetry extends JsonObject {
  kind: 'autonomous-merge-apply';
  decisionId: string;
  outcome: string;
  lane?: string;
  workerId?: string;
  leaseId?: string;
  patchCount?: number;
  changedPathCount?: number;
  conflictCount?: number;
  rerunCount?: number;
  durationMs?: number;
  reasonCode?: string;
}

export interface AutonomousMergeApplyTelemetryInput {
  decisionId: string;
  outcome: string;
  lane?: string;
  workerId?: string;
  leaseId?: string;
  patchCount?: number;
  changedPathCount?: number;
  conflictCount?: number;
  rerunCount?: number;
  durationMs?: number;
  reasonCode?: string;
}

export interface AutonomousMergeLaneLifecycleTelemetry extends JsonObject {
  kind: 'autonomous-merge-lane';
  lane: string;
  state: string;
  fromState?: string;
  workerCount?: number;
  leaseCount?: number;
  queuedCount?: number;
  completedCount?: number;
  failedCount?: number;
  durationMs?: number;
  reasonCode?: string;
}

export interface AutonomousMergeLaneLifecycleTelemetryInput {
  lane: string;
  state: string;
  fromState?: string;
  workerCount?: number;
  leaseCount?: number;
  queuedCount?: number;
  completedCount?: number;
  failedCount?: number;
  durationMs?: number;
  reasonCode?: string;
}

export function summarizeAutonomousMergeWorker(
  input: AutonomousMergeWorkerTelemetryInput
): AutonomousMergeWorkerTelemetry {
  const workerId = requireString(input.workerId, 'workerId');
  const status = requireString(input.status, 'status');
  const telemetry: AutonomousMergeWorkerTelemetry = {
    kind: 'autonomous-merge-worker',
    workerId,
    status
  };
  assignString(telemetry, 'lane', input.lane);
  assignString(telemetry, 'coordinatorId', input.coordinatorId);
  assignString(telemetry, 'leaseId', input.leaseId);
  assignString(telemetry, 'phase', input.phase);
  assignNumber(telemetry, 'attempt', readCount(input.attempt));
  assignNumber(telemetry, 'queueDepth', readCount(input.queueDepth));
  assignNumber(telemetry, 'activeCount', readCount(input.activeCount));
  assignNumber(telemetry, 'completedCount', readCount(input.completedCount));
  assignNumber(telemetry, 'failedCount', readCount(input.failedCount));
  assignNumber(telemetry, 'rerunCount', readCount(input.rerunCount));
  assignNumber(telemetry, 'durationMs', readDurationMs(input.durationMs));
  assignString(telemetry, 'reasonCode', input.reasonCode);
  return telemetry;
}

export function logAutonomousMergeWorker(
  logger: FrontierLogger,
  level: LogLevelInput,
  input: AutonomousMergeWorkerTelemetryInput,
  attributes?: LogAttributesInput
): LogRecord | undefined {
  return logAutonomousMergeRecord(logger, level, AUTONOMOUS_MERGE_WORKER_RECORD_NAME, summarizeAutonomousMergeWorker(input), attributes);
}

export function summarizeAutonomousMergeLease(
  input: AutonomousMergeLeaseTelemetryInput
): AutonomousMergeLeaseTelemetry {
  const leaseId = requireString(input.leaseId, 'leaseId');
  const state = requireString(input.state, 'state');
  const telemetry: AutonomousMergeLeaseTelemetry = {
    kind: 'autonomous-merge-lease',
    leaseId,
    state
  };
  assignString(telemetry, 'coordinatorId', input.coordinatorId);
  assignString(telemetry, 'lane', input.lane);
  assignNumber(telemetry, 'leaseAgeMs', readDurationMs(input.leaseAgeMs));
  assignNumber(telemetry, 'expiresInMs', readDurationMs(input.expiresInMs));
  assignNumber(telemetry, 'renewCount', readCount(input.renewCount));
  assignNumber(telemetry, 'durationMs', readDurationMs(input.durationMs));
  assignString(telemetry, 'reasonCode', input.reasonCode);
  return telemetry;
}

export function logCoordinatorLease(
  logger: FrontierLogger,
  level: LogLevelInput,
  input: AutonomousMergeLeaseTelemetryInput,
  attributes?: LogAttributesInput
): LogRecord | undefined {
  return logAutonomousMergeRecord(logger, level, AUTONOMOUS_MERGE_LEASE_RECORD_NAME, summarizeAutonomousMergeLease(input), attributes);
}

export function summarizeAutonomousMergeGateRun(
  input: AutonomousMergeGateTelemetryInput
): AutonomousMergeGateTelemetry {
  const gateId = requireString(input.gateId, 'gateId');
  const result = requireString(input.result, 'result');
  const telemetry: AutonomousMergeGateTelemetry = {
    kind: 'autonomous-merge-gate',
    gateId,
    result
  };
  assignString(telemetry, 'lane', input.lane);
  assignNumber(telemetry, 'checkedCount', readCount(input.checkedCount));
  assignNumber(telemetry, 'passedCount', readCount(input.passedCount));
  assignNumber(telemetry, 'failedCount', readCount(input.failedCount));
  assignNumber(telemetry, 'blockedCount', readCount(input.blockedCount));
  assignNumber(telemetry, 'durationMs', readDurationMs(input.durationMs));
  assignString(telemetry, 'failureClass', input.failureClass);
  assignString(telemetry, 'reasonCode', input.reasonCode);
  return telemetry;
}

export function logAutonomousMergeGateRun(
  logger: FrontierLogger,
  level: LogLevelInput,
  input: AutonomousMergeGateTelemetryInput,
  attributes?: LogAttributesInput
): LogRecord | undefined {
  return logAutonomousMergeRecord(logger, level, AUTONOMOUS_MERGE_GATE_RECORD_NAME, summarizeAutonomousMergeGateRun(input), attributes);
}

export function summarizeAutonomousMergeApplyDecision(
  input: AutonomousMergeApplyTelemetryInput
): AutonomousMergeApplyTelemetry {
  const decisionId = requireString(input.decisionId, 'decisionId');
  const outcome = requireString(input.outcome, 'outcome');
  const telemetry: AutonomousMergeApplyTelemetry = {
    kind: 'autonomous-merge-apply',
    decisionId,
    outcome
  };
  assignString(telemetry, 'lane', input.lane);
  assignString(telemetry, 'workerId', input.workerId);
  assignString(telemetry, 'leaseId', input.leaseId);
  assignNumber(telemetry, 'patchCount', readCount(input.patchCount));
  assignNumber(telemetry, 'changedPathCount', readCount(input.changedPathCount));
  assignNumber(telemetry, 'conflictCount', readCount(input.conflictCount));
  assignNumber(telemetry, 'rerunCount', readCount(input.rerunCount));
  assignNumber(telemetry, 'durationMs', readDurationMs(input.durationMs));
  assignString(telemetry, 'reasonCode', input.reasonCode);
  return telemetry;
}

export function logAutonomousMergeApplyDecision(
  logger: FrontierLogger,
  level: LogLevelInput,
  input: AutonomousMergeApplyTelemetryInput,
  attributes?: LogAttributesInput
): LogRecord | undefined {
  return logAutonomousMergeRecord(logger, level, AUTONOMOUS_MERGE_APPLY_RECORD_NAME, summarizeAutonomousMergeApplyDecision(input), attributes);
}

export function summarizeAutonomousMergeLaneLifecycle(
  input: AutonomousMergeLaneLifecycleTelemetryInput
): AutonomousMergeLaneLifecycleTelemetry {
  const lane = requireString(input.lane, 'lane');
  const state = requireString(input.state, 'state');
  const telemetry: AutonomousMergeLaneLifecycleTelemetry = {
    kind: 'autonomous-merge-lane',
    lane,
    state
  };
  assignString(telemetry, 'fromState', input.fromState);
  assignNumber(telemetry, 'workerCount', readCount(input.workerCount));
  assignNumber(telemetry, 'leaseCount', readCount(input.leaseCount));
  assignNumber(telemetry, 'queuedCount', readCount(input.queuedCount));
  assignNumber(telemetry, 'completedCount', readCount(input.completedCount));
  assignNumber(telemetry, 'failedCount', readCount(input.failedCount));
  assignNumber(telemetry, 'durationMs', readDurationMs(input.durationMs));
  assignString(telemetry, 'reasonCode', input.reasonCode);
  return telemetry;
}

export function logAutonomousMergeLaneLifecycle(
  logger: FrontierLogger,
  level: LogLevelInput,
  input: AutonomousMergeLaneLifecycleTelemetryInput,
  attributes?: LogAttributesInput
): LogRecord | undefined {
  return logAutonomousMergeRecord(logger, level, AUTONOMOUS_MERGE_LANE_RECORD_NAME, summarizeAutonomousMergeLaneLifecycle(input), attributes);
}

export function summarizeSemanticStreamRecord(
  input: SemanticStreamTelemetryInput
): SemanticStreamTelemetry {
  const kind = requireSemanticStreamKind(input.kind);
  const telemetry: SemanticStreamTelemetry = { kind };
  assignSemanticStreamString(telemetry, 'semanticRegionKey', input.semanticRegionKey);
  assignSemanticStreamStringList(telemetry, 'semanticRegionKeys', input.semanticRegionKeys);
  assignSemanticStreamString(telemetry, 'sourceHead', input.sourceHead);
  assignSemanticStreamStringList(telemetry, 'sourceHeads', input.sourceHeads);
  assignSemanticStreamString(telemetry, 'currentHead', input.currentHead);
  assignSemanticStreamStringList(telemetry, 'currentHeads', input.currentHeads);
  assignSemanticStreamString(telemetry, 'taskId', input.taskId);
  assignSemanticStreamStringList(telemetry, 'taskIds', input.taskIds);
  assignSemanticStreamString(telemetry, 'leaseKey', input.leaseKey);
  assignSemanticStreamStringList(telemetry, 'leaseKeys', input.leaseKeys);
  assignSemanticStreamString(telemetry, 'leaseId', input.leaseId);
  assignSemanticStreamString(telemetry, 'sliceId', input.sliceId);
  assignSemanticStreamString(telemetry, 'mergeId', input.mergeId);
  assignSemanticStreamString(telemetry, 'promotionParent', input.promotionParent);
  assignSemanticStreamStringList(telemetry, 'promotionParents', input.promotionParents);
  assignSemanticStreamString(telemetry, 'supersedingMergeId', input.supersedingMergeId);
  return telemetry;
}

export function logSemanticStreamRecord(
  logger: FrontierLogger,
  level: LogLevelInput,
  input: SemanticStreamTelemetryInput,
  attributes?: LogAttributesInput
): LogRecord | undefined {
  if (!logger.isEnabled(level)) return undefined;
  const telemetry = summarizeSemanticStreamRecord(input);
  return logger.record(level, SEMANTIC_STREAM_RECORD_NAME_PREFIX + '.' + telemetry.kind, {
    attributes,
    telemetry
  });
}

function logAutonomousMergeRecord(
  logger: FrontierLogger,
  level: LogLevelInput,
  name: string,
  telemetry: JsonObject,
  attributes?: LogAttributesInput
): LogRecord | undefined {
  if (!logger.isEnabled(level)) return undefined;
  return logger.record(level, name, {
    attributes,
    telemetry
  });
}

function requireString(value: unknown, label: string): string {
  const out = readString(value);
  if (out !== undefined) return out;
  throw new TypeError('frontier logging autonomous merge ' + label + ' must be a non-empty string');
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function readStringList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out: string[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < value.length; i++) {
    const stringValue = readString(value[i]);
    if (stringValue === undefined || seen.has(stringValue)) continue;
    seen.add(stringValue);
    out.push(stringValue);
  }
  return out.length > 0 ? out : undefined;
}

function readCount(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : undefined;
}

function readDurationMs(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : undefined;
}

function assignString(target: JsonObject, key: string, value: unknown): void {
  const out = readString(value);
  if (out !== undefined) target[key] = out;
}

function assignSemanticStreamString(target: JsonObject, key: string, value: unknown): void {
  const out = normalizeSemanticStreamString(value);
  if (out !== undefined) target[key] = out;
}

function assignStringList(target: JsonObject, key: string, value: unknown): void {
  const out = readStringList(value);
  if (out !== undefined) target[key] = out;
}

function assignSemanticStreamStringList(target: JsonObject, key: string, value: unknown): void {
  const out = normalizeSemanticStreamStringList(value);
  if (out !== undefined) target[key] = out;
}

function assignNumber(target: JsonObject, key: string, value: number | undefined): void {
  if (value !== undefined) target[key] = value;
}

function normalizeSemanticStreamString(value: unknown): string | undefined {
  const out = readString(value);
  if (out === undefined) return undefined;
  return isCompactSemanticStreamString(out) ? out : summarizeSemanticStreamString(out);
}

function normalizeSemanticStreamStringList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out: string[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < value.length; i++) {
    const stringValue = normalizeSemanticStreamString(value[i]);
    if (stringValue === undefined || seen.has(stringValue)) continue;
    seen.add(stringValue);
    out.push(stringValue);
  }
  return out.length > 0 ? out : undefined;
}

function isCompactSemanticStreamString(value: string): boolean {
  return value.length <= SEMANTIC_STREAM_INLINE_STRING_LIMIT && !/\s/.test(value);
}

function summarizeSemanticStreamString(value: string): string {
  return SEMANTIC_STREAM_SUMMARY_PREFIX + value.length + ':' + hashSemanticStreamString(value);
}

function hashSemanticStreamString(value: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function requireSemanticStreamKind(value: unknown): SemanticStreamEventKind {
  const kind = readString(value);
  if (
    kind === 'slice.claimed' ||
    kind === 'slice.applied' ||
    kind === 'lease.acquired' ||
    kind === 'lease.released' ||
    kind === 'merge.promoted' ||
    kind === 'merge.superseded'
  ) {
    return kind;
  }
  throw new TypeError('frontier logging semantic stream kind must be a known semantic change stream event');
}
