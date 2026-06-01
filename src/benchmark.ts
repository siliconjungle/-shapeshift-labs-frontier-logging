import type { JsonObject } from '@shapeshift-labs/frontier/types';
import {
  compactLogBatch,
  encodeLogBatch,
  type CompactLogBatch,
  type LogRecord
} from './logging.ts';

export interface LogTraceSnapshotSource {
  readonly dropped?: number;
  snapshot(): LogRecord[];
}

export type LogTraceSource = readonly LogRecord[] | LogTraceSnapshotSource;

export interface BenchmarkLogTraceOptions {
  maxRecords?: number;
  includeBatch?: boolean;
  now?: number;
}

export interface BenchmarkLogTrace {
  format: 'frontier-log-batch-v1';
  recordCount: number;
  byteLength: number;
  dropped: number;
  batch?: CompactLogBatch;
}

export function createBenchmarkLogTrace(source: LogTraceSource, options: BenchmarkLogTraceOptions = {}): BenchmarkLogTrace {
  const allRecords = hasSnapshot(source) ? source.snapshot() : source;
  const maxRecords = options.maxRecords === undefined ? allRecords.length : Math.max(0, Math.floor(options.maxRecords));
  const start = Math.max(0, allRecords.length - maxRecords);
  const records = start === 0 ? allRecords : allRecords.slice(start);
  const dropped = (hasSnapshot(source) ? source.dropped || 0 : 0) + start;
  const byteLength = encodeLogBatch(records).byteLength;
  const trace: BenchmarkLogTrace = {
    format: 'frontier-log-batch-v1',
    recordCount: records.length,
    byteLength,
    dropped
  };
  if (options.includeBatch !== false) trace.batch = compactLogBatch(records, options.now);
  return trace;
}

export function attachBenchmarkLogTrace<T extends JsonObject>(
  payload: T,
  source: LogTraceSource,
  options: BenchmarkLogTraceOptions & { key?: string } = {}
): T {
  (payload as JsonObject)[options.key || 'logTrace'] = createBenchmarkLogTrace(source, options) as unknown as JsonObject;
  return payload;
}

function hasSnapshot(source: LogTraceSource): source is LogTraceSnapshotSource {
  return typeof (source as LogTraceSnapshotSource).snapshot === 'function';
}
