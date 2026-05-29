import { encodePatch } from '@shapeshift-labs/frontier-codec/codec';
import {
  OP_APPEND,
  OP_ARRAY_ASSIGN,
  OP_ARRAY_MOVE,
  OP_ARRAY_OBJECT_ASSIGN,
  OP_ARRAY_OBJECT_FIELD_ASSIGN,
  OP_ARRAY_SPLICE,
  OP_ARRAY_TWO_FIELD_INSERT,
  OP_ARRAY_TUPLE_ASSIGN,
  OP_ASSIGN,
  OP_REMOVE,
  OP_SCALAR_ARRAY_REPLACE,
  OP_SET,
  OP_STRING_COPY,
  OP_STRING_SPLICE,
  OP_TRUNCATE
} from '@shapeshift-labs/frontier/constants';
import type {
  JsonObject,
  JsonPath,
  JsonValue,
  Patch,
  PatchOperation
} from '@shapeshift-labs/frontier/types';
import type { FrontierRegistryGraph } from '@shapeshift-labs/frontier/registry';
import type {
  CrdtStateVector,
  CrdtUpdateTelemetry,
  FrontierLogger,
  LogAttributesInput,
  LogLevelInput,
  LogRecord,
  PatchTelemetry
} from './logging.js';

export interface PatchTelemetryOptions {
  includeByteLength?: boolean;
  pathSampleLimit?: number;
}

export interface CrdtTelemetryOptions {
  pathSampleLimit?: number;
  headSampleLimit?: number;
}

export interface RegistryTelemetryOptions {
  entrySampleLimit?: number;
  featureSampleLimit?: number;
  packageSampleLimit?: number;
  pathSampleLimit?: number;
}

export interface RegistryGraphTelemetry extends JsonObject {
  kind: 'registry';
  entryCount: number;
  recordCount: number;
  edgeCount: number;
  featureCount: number;
  packageCount: number;
  tagCount: number;
  fileCount: number;
  pathCount: number;
  entrySamples: string[];
  featureSamples: string[];
  packageSamples: string[];
  pathSamples: string[];
}

export type CrdtOperationId = string;
export type CrdtActorId = string;

export type CrdtOperation =
  | {
      type: string;
      id: CrdtOperationId;
      actor: CrdtActorId;
      seq: number;
      deps?: CrdtOperationId[];
      path: JsonPath;
      count?: number;
      values?: JsonValue[];
      text?: string;
      elems?: string[];
    }
  | {
      type: string;
      id?: CrdtOperationId;
      actor?: CrdtActorId;
      seq?: number;
      deps?: CrdtOperationId[];
      path?: JsonPath;
      count?: number;
      values?: JsonValue[];
      text?: string;
      elems?: string[];
    };

export interface CrdtUpdate {
  actor: CrdtActorId;
  seq: number;
  deps?: CrdtOperationId[];
  ops: CrdtOperation[];
  metadata?: JsonObject;
}

export type CrdtUpdateInput = ArrayBuffer | ArrayBufferView | CrdtUpdate;

const PATCH_OPERATION_NAMES: Record<number, string> = {
  [OP_SET]: 'OP_SET',
  [OP_REMOVE]: 'OP_REMOVE',
  [OP_TRUNCATE]: 'OP_TRUNCATE',
  [OP_APPEND]: 'OP_APPEND',
  [OP_ASSIGN]: 'OP_ASSIGN',
  [OP_STRING_SPLICE]: 'OP_STRING_SPLICE',
  [OP_ARRAY_SPLICE]: 'OP_ARRAY_SPLICE',
  [OP_ARRAY_MOVE]: 'OP_ARRAY_MOVE',
  [OP_STRING_COPY]: 'OP_STRING_COPY',
  [OP_ARRAY_ASSIGN]: 'OP_ARRAY_ASSIGN',
  [OP_ARRAY_OBJECT_ASSIGN]: 'OP_ARRAY_OBJECT_ASSIGN',
  [OP_ARRAY_TUPLE_ASSIGN]: 'OP_ARRAY_TUPLE_ASSIGN',
  [OP_ARRAY_OBJECT_FIELD_ASSIGN]: 'OP_ARRAY_OBJECT_FIELD_ASSIGN',
  [OP_SCALAR_ARRAY_REPLACE]: 'OP_SCALAR_ARRAY_REPLACE',
  [OP_ARRAY_TWO_FIELD_INSERT]: 'OP_ARRAY_TWO_FIELD_INSERT'
};
const textEncoder = new TextEncoder();

export function summarizePatch(patch: Patch, options: PatchTelemetryOptions = {}): PatchTelemetry {
  const operationTypes: JsonObject = {};
  const seenPaths = new Set<string>();
  const pathSamples: string[] = [];
  let maxPathDepth = 0;
  const sampleLimit = readLimit(options.pathSampleLimit, 8);

  for (let i = 0, length = patch.length; i < length; i++) {
    const op = patch[i];
    const name = PATCH_OPERATION_NAMES[op[0]] || String(op[0]);
    operationTypes[name] = ((operationTypes[name] as number | undefined) || 0) + 1;
    maxPathDepth = collectPathTelemetry(op[1], seenPaths, pathSamples, maxPathDepth, sampleLimit);
    maxPathDepth = collectOperationExtraPaths(op, seenPaths, pathSamples, sampleLimit, maxPathDepth);
  }

  const telemetry: PatchTelemetry = {
    kind: 'patch',
    opCount: patch.length,
    operationTypes,
    pathCount: seenPaths.size,
    maxPathDepth,
    pathSamples
  };
  if (options.includeByteLength) telemetry.byteLength = encodePatch(patch, { validate: false }).byteLength;
  return telemetry;
}

export function summarizeCrdtUpdate(input: CrdtUpdateInput, options: CrdtTelemetryOptions = {}): CrdtUpdateTelemetry {
  const update = readCrdtUpdate(input);
  const operationTypes: JsonObject = {};
  const seenPaths = new Set<string>();
  const pathSamples: string[] = [];
  const actors = new Set<string>();
  const heads: string[] = [];
  const stateVector: CrdtStateVector = {};
  const sampleLimit = readLimit(options.pathSampleLimit, 8);
  const headSampleLimit = readLimit(options.headSampleLimit, 8);
  let maxPathDepth = 0;
  let logicalOpCount = 0;

  for (let i = 0, length = update.ops.length; i < length; i++) {
    const op = update.ops[i];
    operationTypes[op.type] = ((operationTypes[op.type] as number | undefined) || 0) + 1;
    const actor = op.actor || update.actor;
    const seq = op.seq === undefined ? update.seq + i : op.seq;
    actors.add(actor);
    if (op.id !== undefined && heads.length < headSampleLimit) heads[heads.length] = op.id;
    const logicalCount = crdtLogicalCount(op);
    logicalOpCount += logicalCount;
    stateVector[actor] = Math.max(stateVector[actor] || 0, seq + logicalCount - 1);
    if (op.path !== undefined) {
      maxPathDepth = collectPathTelemetry(op.path, seenPaths, pathSamples, maxPathDepth, sampleLimit);
    }
  }

  return {
    kind: 'crdt-update',
    byteLength: byteLengthOfCrdtInput(input, update),
    actor: update.actor,
    seq: update.seq,
    opCount: update.ops.length,
    logicalOpCount,
    actors: Array.from(actors).sort(),
    heads,
    stateVector,
    operationTypes,
    pathCount: seenPaths.size,
    maxPathDepth,
    pathSamples
  };
}

export function logPatch(
  logger: FrontierLogger,
  level: LogLevelInput,
  name: string,
  patch: Patch,
  attributes?: LogAttributesInput,
  options?: PatchTelemetryOptions
): LogRecord | undefined {
  if (!logger.isEnabled(level)) return undefined;
  return logger.record(level, name, {
    attributes,
    patch: summarizePatch(patch, options)
  });
}

export function logCrdtUpdate(
  logger: FrontierLogger,
  level: LogLevelInput,
  name: string,
  update: CrdtUpdateInput,
  attributes?: LogAttributesInput,
  options?: CrdtTelemetryOptions
): LogRecord | undefined {
  if (!logger.isEnabled(level)) return undefined;
  return logger.record(level, name, {
    attributes,
    crdt: summarizeCrdtUpdate(update, options)
  });
}

export function summarizeRegistryGraph(
  graph: FrontierRegistryGraph,
  options: RegistryTelemetryOptions = {}
): RegistryGraphTelemetry {
  const entrySampleLimit = readLimit(options.entrySampleLimit, 8);
  const featureSampleLimit = readLimit(options.featureSampleLimit, 8);
  const packageSampleLimit = readLimit(options.packageSampleLimit, 8);
  const pathSampleLimit = readLimit(options.pathSampleLimit, 8);
  const features = new Set<string>();
  const packages = new Set<string>();
  const tags = new Set<string>();
  const files = new Set<string>();
  const paths = new Set<string>();
  const entrySamples: string[] = [];
  const featureSamples: string[] = [];
  const packageSamples: string[] = [];
  const pathSamples: string[] = [];

  for (let i = 0; i < graph.entries.length; i++) {
    const entry = graph.entries[i];
    if (entry.feature !== undefined) {
      features.add(entry.feature);
      if (featureSamples.length < featureSampleLimit && !featureSamples.includes(entry.feature)) featureSamples[featureSamples.length] = entry.feature;
    }
    if (entry.package !== undefined) {
      packages.add(entry.package);
      if (packageSamples.length < packageSampleLimit && !packageSamples.includes(entry.package)) packageSamples[packageSamples.length] = entry.package;
    }
    for (const tag of entry.tags ?? []) tags.add(String(tag));
    collectRegistrySourceFiles(entry.source, files);
    if (entrySamples.length < entrySampleLimit) entrySamples[entrySamples.length] = entry.id;
  }
  for (let i = 0; i < graph.edges.length; i++) {
    const edge = graph.edges[i];
    collectRegistryPathSample(edge.from, paths, pathSamples, pathSampleLimit);
    collectRegistryPathSample(edge.to, paths, pathSamples, pathSampleLimit);
  }

  return {
    kind: 'registry',
    entryCount: graph.entries.length,
    recordCount: graph.records.length,
    edgeCount: graph.edges.length,
    featureCount: features.size,
    packageCount: packages.size,
    tagCount: tags.size,
    fileCount: files.size,
    pathCount: paths.size,
    entrySamples,
    featureSamples,
    packageSamples,
    pathSamples
  };
}

export function logRegistryGraph(
  logger: FrontierLogger,
  level: LogLevelInput,
  name: string,
  graph: FrontierRegistryGraph,
  attributes?: LogAttributesInput,
  options?: RegistryTelemetryOptions
): LogRecord | undefined {
  if (!logger.isEnabled(level)) return undefined;
  return logger.record(level, name, {
    attributes,
    telemetry: summarizeRegistryGraph(graph, options)
  });
}

function readLimit(value: number | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  return Math.max(0, Math.floor(value));
}

function collectPathTelemetry(path: JsonPath, seenPaths: Set<string>, samples: string[], maxDepth: number, sampleLimit: number): number {
  if (path.length > maxDepth) maxDepth = path.length;
  const key = stringifyPath(path);
  if (!seenPaths.has(key)) {
    seenPaths.add(key);
    if (samples.length < sampleLimit) samples[samples.length] = key;
  }
  return maxDepth;
}

function collectRegistryPathSample(node: string, seenPaths: Set<string>, samples: string[], sampleLimit: number): void {
  if (!node.startsWith('path:')) return;
  const path = node.slice(5);
  if (seenPaths.has(path)) return;
  seenPaths.add(path);
  if (samples.length < sampleLimit) samples[samples.length] = path;
}

function collectRegistrySourceFiles(source: unknown, files: Set<string>): void {
  if (source === undefined || source === null) return;
  const list = Array.isArray(source) ? source : [source];
  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    if (item !== null && typeof item === 'object' && typeof (item as { file?: unknown }).file === 'string') {
      files.add((item as { file: string }).file);
    }
  }
}

function collectOperationExtraPaths(op: PatchOperation, seenPaths: Set<string>, samples: string[], sampleLimit: number, maxPathDepth: number): number {
  if (op[0] === OP_ARRAY_OBJECT_FIELD_ASSIGN) {
    const fieldPaths = op[3] as JsonPath[];
    for (let i = 0, length = fieldPaths.length; i < length; i++) {
      maxPathDepth = collectPathTelemetry(fieldPaths[i], seenPaths, samples, maxPathDepth, sampleLimit);
    }
  }
  return maxPathDepth;
}

function stringifyPath(path: JsonPath): string {
  return path.length === 0 ? '$' : JSON.stringify(path);
}

function crdtLogicalCount(op: CrdtOperation): number {
  if ('count' in op && typeof op.count === 'number') return Math.max(1, op.count);
  if ((op.type === 'listInsert' || op.type === 'listRun') && op.values !== undefined) return Math.max(1, op.values.length);
  if ((op.type === 'textInsert' || op.type === 'textRun') && op.text !== undefined) return Math.max(1, op.text.length);
  if ((op.type === 'listDel' || op.type === 'textDel') && op.elems !== undefined) return Math.max(1, op.elems.length);
  return 1;
}

function byteLengthOfCrdtInput(input: CrdtUpdateInput, update: CrdtUpdate): number {
  if (input instanceof ArrayBuffer) return input.byteLength;
  if (ArrayBuffer.isView(input)) return input.byteLength;
  return textEncoder.encode(JSON.stringify(update)).byteLength;
}

function readCrdtUpdate(input: CrdtUpdateInput): CrdtUpdate {
  if (input instanceof ArrayBuffer || ArrayBuffer.isView(input)) {
    return {
      actor: 'encoded',
      seq: 0,
      ops: []
    };
  }
  return input;
}
