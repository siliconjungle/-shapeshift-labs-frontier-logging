import type { JsonArray, JsonObject, JsonValue } from '@shapeshift-labs/frontier/types';
import type { LogRecord } from './logging.ts';

export interface OpenTelemetryExportOptions {
  resource?: JsonObject;
  scopeName?: string;
  scopeVersion?: string;
}

export interface PerfettoExportOptions {
  pid?: number;
  tid?: number;
  category?: string;
}

export interface OpenTelemetryLogsPayload {
  resourceLogs: Array<{
    resource: { attributes: OpenTelemetryAttribute[] };
    scopeLogs: Array<{
      scope: { name: string; version?: string };
      logRecords: OpenTelemetryLogRecord[];
    }>;
  }>;
}

export interface OpenTelemetryLogRecord {
  timeUnixNano: string;
  observedTimeUnixNano?: string;
  severityNumber: number;
  severityText: string;
  body?: { [key: string]: unknown };
  attributes: OpenTelemetryAttribute[];
  traceId?: string;
  spanId?: string;
}

export interface OpenTelemetryAttribute {
  key: string;
  value: { [key: string]: unknown };
}

export interface PerfettoTracePayload {
  traceEvents: PerfettoTraceEvent[];
  displayTimeUnit: 'ms';
}

export interface PerfettoTraceEvent {
  name: string;
  cat: string;
  ph: 'X' | 'i';
  ts: number;
  dur?: number;
  pid: number;
  tid: number;
  s?: 't';
  args?: JsonObject;
}

export function exportOpenTelemetryLogs(records: readonly LogRecord[], options: OpenTelemetryExportOptions = {}): OpenTelemetryLogsPayload {
  const resource = mergeObjects(options.resource, records[0]?.resource);
  const scopeName = options.scopeName || records[0]?.scope || 'frontier.logging';
  const scope: { name: string; version?: string } = { name: scopeName };
  if (options.scopeVersion !== undefined) scope.version = options.scopeVersion;
  return {
    resourceLogs: [{
      resource: { attributes: attributesToOtel(resource || {}) },
      scopeLogs: [{
        scope,
        logRecords: records.map(recordToOtel)
      }]
    }]
  };
}

export const exportLogRecordsAsOpenTelemetry = exportOpenTelemetryLogs;

export function exportPerfettoTraceEvents(records: readonly LogRecord[], options: PerfettoExportOptions = {}): PerfettoTracePayload {
  const pid = options.pid === undefined ? 1 : options.pid;
  const tid = options.tid === undefined ? 1 : options.tid;
  const category = options.category || 'frontier.logging';
  return {
    traceEvents: records.map((record) => {
      const event: PerfettoTraceEvent = {
        name: record.name || record.message || record.level,
        cat: record.scope || category,
        ph: record.durationMs === undefined ? 'i' : 'X',
        ts: record.time * 1000,
        pid,
        tid,
        args: buildPerfettoArgs(record)
      };
      if (record.durationMs !== undefined) event.dur = record.durationMs * 1000;
      else event.s = 't';
      return event;
    }),
    displayTimeUnit: 'ms'
  };
}

export const exportLogRecordsAsPerfetto = exportPerfettoTraceEvents;

function recordToOtel(record: LogRecord): OpenTelemetryLogRecord {
  const out: OpenTelemetryLogRecord = {
    timeUnixNano: millisToUnixNano(record.time),
    severityNumber: record.severityNumber,
    severityText: record.level.toUpperCase(),
    body: anyValue(record.message || record.name || record.level),
    attributes: attributesToOtel(buildOtelAttributes(record))
  };
  if (record.observedTime !== undefined) out.observedTimeUnixNano = millisToUnixNano(record.observedTime);
  if (record.traceId !== undefined) out.traceId = record.traceId;
  if (record.spanId !== undefined) out.spanId = record.spanId;
  return out;
}

function buildOtelAttributes(record: LogRecord): JsonObject {
  const out: JsonObject = {};
  if (record.attributes) assignPrefixed(out, '', record.attributes);
  if (record.telemetry) assignPrefixed(out, 'telemetry.', record.telemetry);
  if (record.patch) {
    out['frontier.patch.op_count'] = record.patch.opCount;
    out['frontier.patch.path_count'] = record.patch.pathCount;
    out['frontier.patch.max_path_depth'] = record.patch.maxPathDepth;
    if (record.patch.byteLength !== undefined) out['frontier.patch.byte_length'] = record.patch.byteLength;
  }
  if (record.crdt) {
    out['frontier.crdt.byte_length'] = record.crdt.byteLength;
    out['frontier.crdt.actor'] = record.crdt.actor;
    out['frontier.crdt.seq'] = record.crdt.seq;
    out['frontier.crdt.op_count'] = record.crdt.opCount;
    out['frontier.crdt.logical_op_count'] = record.crdt.logicalOpCount;
  }
  if (record.durationMs !== undefined) out['duration_ms'] = record.durationMs;
  if (record.parentSpanId !== undefined) out['parent_span_id'] = record.parentSpanId;
  return out;
}

function buildPerfettoArgs(record: LogRecord): JsonObject {
  const out: JsonObject = {};
  if (record.level) out.level = record.level;
  if (record.severityNumber) out.severityNumber = record.severityNumber;
  if (record.message !== undefined) out.message = record.message;
  if (record.traceId !== undefined) out.traceId = record.traceId;
  if (record.spanId !== undefined) out.spanId = record.spanId;
  if (record.parentSpanId !== undefined) out.parentSpanId = record.parentSpanId;
  if (record.attributes !== undefined) out.attributes = record.attributes;
  if (record.telemetry !== undefined) out.telemetry = record.telemetry;
  if (record.patch !== undefined) out.patch = record.patch as unknown as JsonObject;
  if (record.crdt !== undefined) out.crdt = record.crdt as unknown as JsonObject;
  return out;
}

function attributesToOtel(input: JsonObject): OpenTelemetryAttribute[] {
  const keys = Object.keys(input);
  const out = new Array<OpenTelemetryAttribute>(keys.length);
  for (let i = 0, length = keys.length; i < length; i++) {
    const key = keys[i];
    out[i] = { key, value: anyValue(input[key]) };
  }
  return out;
}

function anyValue(value: JsonValue): { [key: string]: unknown } {
  if (value === null) return { stringValue: 'null' };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { boolValue: value };
  if (typeof value === 'number') {
    return Number.isInteger(value) ? { intValue: String(value) } : { doubleValue: value };
  }
  if (Array.isArray(value)) {
    return {
      arrayValue: {
        values: (value as JsonArray).map(anyValue)
      }
    };
  }
  return {
    kvlistValue: {
      values: attributesToOtel(value)
    }
  };
}

function assignPrefixed(out: JsonObject, prefix: string, input: JsonObject): void {
  for (const key of Object.keys(input)) out[prefix + key] = input[key];
}

function mergeObjects(left: JsonObject | undefined, right: JsonObject | undefined): JsonObject | undefined {
  if (!left && !right) return undefined;
  const out: JsonObject = {};
  if (left) {
    for (const key of Object.keys(left)) out[key] = left[key];
  }
  if (right) {
    for (const key of Object.keys(right)) out[key] = right[key];
  }
  return out;
}

function millisToUnixNano(ms: number): string {
  return String(Math.max(0, Math.floor(ms * 1000000)));
}
