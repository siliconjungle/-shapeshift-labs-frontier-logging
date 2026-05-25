import type {
  JsonArray,
  JsonObject,
  JsonValue
} from '@shapeshift-labs/frontier/types';

export interface CrdtStateVector {
  [actorId: string]: number;
}

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
export type LogLevelInput = LogLevel | number;
export type LogAttributesInput = JsonObject | (() => JsonObject | undefined) | undefined;
export type LogRedactMatcher = string | RegExp;

export interface LogRecord {
  time: number;
  observedTime?: number;
  level: LogLevel;
  severityNumber: number;
  name?: string;
  message?: string;
  traceId?: string;
  spanId?: string;
  parentSpanId?: string;
  durationMs?: number;
  resource?: JsonObject;
  scope?: string;
  attributes?: JsonObject;
  telemetry?: JsonObject;
  patch?: PatchTelemetry;
  crdt?: CrdtUpdateTelemetry;
}

export interface PatchTelemetry {
  kind: 'patch';
  opCount: number;
  byteLength?: number;
  operationTypes: JsonObject;
  pathCount: number;
  maxPathDepth: number;
  pathSamples: string[];
}

export interface CrdtUpdateTelemetry {
  kind: 'crdt-update';
  byteLength: number;
  actor: string;
  seq: number;
  opCount: number;
  logicalOpCount: number;
  actors: string[];
  heads: string[];
  stateVector: CrdtStateVector;
  operationTypes: JsonObject;
  pathCount: number;
  maxPathDepth: number;
  pathSamples: string[];
}

export interface LogEventOptions {
  attributes?: LogAttributesInput;
  message?: string;
  observedTime?: number;
  telemetry?: JsonObject;
  patch?: PatchTelemetry;
  crdt?: CrdtUpdateTelemetry;
}

export interface LogSampleInput {
  level: LogLevel;
  severityNumber: number;
  name: string;
}

export interface LogSink {
  write(record: LogRecord): void;
  flush?(): void;
  snapshot?(): LogRecord[];
  clear?(): void;
}

export interface LogBuffer extends LogSink {
  readonly capacity: number;
  readonly size: number;
  readonly dropped: number;
  readonly writes: number;
  snapshot(): LogRecord[];
  clear(): void;
}

export interface LoggerOptions {
  level?: LogLevelInput;
  context?: JsonObject;
  resource?: JsonObject;
  scope?: string;
  traceId?: string;
  spanId?: string;
  parentSpanId?: string;
  sinks?: LogSink | readonly LogSink[];
  buffer?: LogBuffer | false;
  bufferCapacity?: number;
  now?: () => number;
  emitSpanStart?: boolean;
  sampleRate?: number;
  sample?: (input: LogSampleInput) => boolean;
  random?: () => number;
  redactKeys?: readonly LogRedactMatcher[];
  redactPaths?: readonly LogRedactMatcher[];
  redactValue?: JsonValue;
  maxStringLength?: number;
  maxAttributeDepth?: number;
  maxPayloadBytes?: number;
}

export interface FrontierLogger {
  readonly level: LogLevel;
  readonly severityNumber: number;
  isEnabled(level: LogLevelInput): boolean;
  child(context?: JsonObject): FrontierLogger;
  startSpan(name: string, attributes?: LogAttributesInput): LogSpan;
  record(level: LogLevelInput, name: string, options?: LogEventOptions): LogRecord | undefined;
  event(level: LogLevelInput, name: string, attributes?: LogAttributesInput, message?: string): LogRecord | undefined;
  trace(name: string, attributes?: LogAttributesInput, message?: string): LogRecord | undefined;
  debug(name: string, attributes?: LogAttributesInput, message?: string): LogRecord | undefined;
  info(name: string, attributes?: LogAttributesInput, message?: string): LogRecord | undefined;
  warn(name: string, attributes?: LogAttributesInput, message?: string): LogRecord | undefined;
  error(name: string, attributes?: LogAttributesInput, message?: string): LogRecord | undefined;
  fatal(name: string, attributes?: LogAttributesInput, message?: string): LogRecord | undefined;
  flush(): void;
  snapshot(): LogRecord[];
  clear(): void;
}

export interface LogSpan {
  readonly name: string;
  readonly traceId: string;
  readonly spanId: string;
  readonly parentSpanId?: string;
  readonly startTime: number;
  readonly logger: FrontierLogger;
  event(level: LogLevelInput, name: string, attributes?: LogAttributesInput, message?: string): LogRecord | undefined;
  record(level: LogLevelInput, name: string, options?: LogEventOptions): LogRecord | undefined;
  end(attributes?: LogAttributesInput): LogRecord | undefined;
}

export interface CompactLogBatch {
  version: 1;
  generatedAt: number;
  keys: string[];
  paths: string[];
  records: CompactLogRecord[];
}

export type CompactLogRecord = {
  t: number;
  o?: number;
  l: number;
  n?: string;
  m?: string;
  tr?: string;
  s?: string;
  ps?: string;
  d?: number;
  r?: CompactAttributes;
  sc?: string;
  a?: CompactAttributes;
  te?: CompactAttributes;
  p?: CompactPatchTelemetry;
  c?: CompactCrdtTelemetry;
};

export type CompactAttributes = Array<[number, JsonValue]>;

export type CompactPatchTelemetry = {
  o: number;
  b?: number;
  k: CompactAttributes;
  pc: number;
  md: number;
  ps: number[];
};

export type CompactCrdtTelemetry = {
  b: number;
  a: string;
  s: number;
  o: number;
  lo: number;
  aa: string[];
  h: string[];
  sv: CrdtStateVector;
  k: CompactAttributes;
  pc: number;
  md: number;
  ps: number[];
};

export interface BrowserLogSinkOptions {
  console?: BrowserConsole;
  includeRecord?: boolean;
}

interface BrowserConsole {
  debug?: (...args: unknown[]) => void;
  info?: (...args: unknown[]) => void;
  warn?: (...args: unknown[]) => void;
  error?: (...args: unknown[]) => void;
  log?: (...args: unknown[]) => void;
}

interface LoggerControls {
  sampleRate: number;
  sample?: (input: LogSampleInput) => boolean;
  random: () => number;
  sanitize: boolean;
  redactKeys: readonly LogRedactMatcher[];
  redactPaths: readonly LogRedactMatcher[];
  redactValue: JsonValue;
  maxStringLength: number | undefined;
  maxAttributeDepth: number | undefined;
  maxPayloadBytes: number | undefined;
}

export const LOG_LEVELS: Record<LogLevel, number> = {
  trace: 1,
  debug: 5,
  info: 9,
  warn: 13,
  error: 17,
  fatal: 21
};

const LOG_LEVEL_NAMES: LogLevel[] = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
const TRUNCATED_VALUE = '[truncated]';

export function createLogger(options: LoggerOptions = {}): FrontierLogger {
  const buffer = options.buffer === false ? null : options.buffer || createLogBuffer({ capacity: options.bufferCapacity });
  const sinks = normalizeSinks(options.sinks, buffer);
  return new FrontierLoggerImpl({
    threshold: severityNumber(options.level === undefined ? 'info' : options.level),
    context: cloneJsonObject(options.context),
    resource: cloneJsonObject(options.resource),
    scope: options.scope,
    traceId: options.traceId || createTraceId(),
    spanId: options.spanId,
    parentSpanId: options.parentSpanId,
    sinks,
    buffer,
    now: options.now || Date.now,
    emitSpanStart: options.emitSpanStart !== false,
    idSource: createIdSource(),
    controls: createControls(options)
  });
}

export function createLogBuffer(options: { capacity?: number } = {}): LogBuffer {
  const capacity = Math.max(1, Math.floor(options.capacity || 1024));
  return new RingLogBuffer(capacity);
}

export function compactLogBatch(records: readonly LogRecord[], now: number = Date.now()): CompactLogBatch {
  const keyTable = createDictionary();
  const pathTable = createDictionary();
  const compactRecords = new Array<CompactLogRecord>(records.length);
  for (let i = 0, length = records.length; i < length; i++) {
    compactRecords[i] = compactRecord(records[i], keyTable, pathTable);
  }
  return {
    version: 1,
    generatedAt: now,
    keys: keyTable.values,
    paths: pathTable.values,
    records: compactRecords
  };
}

export function encodeLogBatch(records: readonly LogRecord[]): Uint8Array {
  return textEncoder.encode(JSON.stringify(compactLogBatch(records)));
}

export function decodeLogBatch(input: string | ArrayBuffer | ArrayBufferView | CompactLogBatch): LogRecord[] {
  const batch = typeof input === 'string'
    ? JSON.parse(input) as CompactLogBatch
    : isCompactLogBatch(input)
      ? input
      : JSON.parse(textDecoder.decode(input instanceof ArrayBuffer ? new Uint8Array(input) : input)) as CompactLogBatch;
  if (batch.version !== 1 || !Array.isArray(batch.records)) throw new Error('invalid Frontier log batch');
  const out = new Array<LogRecord>(batch.records.length);
  for (let i = 0, length = batch.records.length; i < length; i++) {
    out[i] = expandRecord(batch.records[i], batch.keys, batch.paths);
  }
  return out;
}

export function createJsonLogSink(write: (line: string) => void): LogSink {
  return {
    write(record) {
      write(JSON.stringify(record));
    }
  };
}

export function createNdjsonLogSink(write: (line: string) => void): LogSink {
  return {
    write(record) {
      write(JSON.stringify(record) + '\n');
    }
  };
}

export function createBrowserLogSink(options: BrowserLogSinkOptions = {}): LogSink {
  const target = options.console || (globalThis as { console?: BrowserConsole }).console || {};
  const includeRecord = options.includeRecord !== false;
  return {
    write(record) {
      const method = record.level === 'trace' || record.level === 'debug'
        ? 'debug'
        : record.level === 'warn'
          ? 'warn'
          : record.level === 'error' || record.level === 'fatal'
            ? 'error'
            : 'info';
      const write = target[method] || target.log;
      if (!write) return;
      if (includeRecord) write.call(target, record.message || record.name || record.level, record);
      else write.call(target, record.message || record.name || record.level);
    }
  };
}

class FrontierLoggerImpl implements FrontierLogger {
  readonly severityNumber: number;
  readonly level: LogLevel;
  private readonly context: JsonObject | undefined;
  private readonly resource: JsonObject | undefined;
  private readonly scope: string | undefined;
  private readonly traceId: string;
  private readonly spanId: string | undefined;
  private readonly parentSpanId: string | undefined;
  private readonly sinks: LogSink[];
  private readonly buffer: LogBuffer | null;
  private readonly now: () => number;
  private readonly emitSpanStart: boolean;
  private readonly idSource: () => string;
  private readonly controls: LoggerControls;
  private readonly fastPath: boolean;

  constructor(options: {
    threshold: number;
    context?: JsonObject;
    resource?: JsonObject;
    scope?: string;
    traceId: string;
    spanId?: string;
    parentSpanId?: string;
    sinks: LogSink[];
    buffer: LogBuffer | null;
    now: () => number;
    emitSpanStart: boolean;
    idSource: () => string;
    controls: LoggerControls;
  }) {
    this.severityNumber = options.threshold;
    this.level = levelName(options.threshold);
    this.context = options.context;
    this.resource = options.resource;
    this.scope = options.scope;
    this.traceId = options.traceId;
    this.spanId = options.spanId;
    this.parentSpanId = options.parentSpanId;
    this.sinks = options.sinks;
    this.buffer = options.buffer;
    this.now = options.now;
    this.emitSpanStart = options.emitSpanStart;
    this.idSource = options.idSource;
    this.controls = options.controls;
    this.fastPath = options.controls.sample === undefined &&
      options.controls.sampleRate === 1 &&
      !options.controls.sanitize &&
      options.controls.maxPayloadBytes === undefined;
  }

  isEnabled(level: LogLevelInput): boolean {
    return severityNumber(level) >= this.severityNumber;
  }

  child(context?: JsonObject): FrontierLogger {
    return new FrontierLoggerImpl({
      threshold: this.severityNumber,
      context: mergeObjects(this.context, context),
      resource: this.resource,
      scope: this.scope,
      traceId: this.traceId,
      spanId: this.spanId,
      parentSpanId: this.parentSpanId,
      sinks: this.sinks,
      buffer: this.buffer,
      now: this.now,
      emitSpanStart: this.emitSpanStart,
      idSource: this.idSource,
      controls: this.controls
    });
  }

  startSpan(name: string, attributes?: LogAttributesInput): LogSpan {
    const spanId = this.idSource();
    const spanLogger = new FrontierLoggerImpl({
      threshold: this.severityNumber,
      context: this.context,
      resource: this.resource,
      scope: this.scope,
      traceId: this.traceId,
      spanId,
      parentSpanId: this.spanId,
      sinks: this.sinks,
      buffer: this.buffer,
      now: this.now,
      emitSpanStart: this.emitSpanStart,
      idSource: this.idSource,
      controls: this.controls
    });
    const span = new FrontierSpanImpl(name, this.traceId, spanId, this.spanId, this.now(), spanLogger, this.now);
    if (this.emitSpanStart) spanLogger.event('trace', name, mergeAttributeInput(attributes, { phase: 'start' }));
    return span;
  }

  record(level: LogLevelInput, name: string, options: LogEventOptions = {}): LogRecord | undefined {
    if (this.fastPath) {
      const severity = severityNumber(level);
      if (severity < this.severityNumber) return undefined;
      const record = this.makeRecord(
        severity,
        levelName(severity),
        name,
        options.attributes,
        options.message,
        options.observedTime,
        options.telemetry,
        options.patch,
        options.crdt
      );
      this.write(record);
      return record;
    }
    return this.emit(level, name, options.attributes, options.message, options.observedTime, options.telemetry, options.patch, options.crdt);
  }

  event(level: LogLevelInput, name: string, attributes?: LogAttributesInput, message?: string): LogRecord | undefined {
    const severity = severityNumber(level);
    if (severity < this.severityNumber) return undefined;
    if (this.fastPath) {
      const record = this.makeRecord(severity, levelName(severity), name, attributes, message);
      this.write(record);
      return record;
    }
    const controls = this.controls;
    let logLevel: LogLevel | undefined;
    if (controls.sample) {
      logLevel = levelName(severity);
      if (!controls.sample({ level: logLevel, severityNumber: severity, name })) return undefined;
    }
    if (controls.sampleRate < 1 && controls.random() >= controls.sampleRate) return undefined;
    const record = this.makeRecord(severity, logLevel || levelName(severity), name, attributes, message);
    const prepared = controls.sanitize || controls.maxPayloadBytes !== undefined ? this.prepareRecord(record) : record;
    this.write(prepared);
    return prepared;
  }

  private emit(
    level: LogLevelInput,
    name: string,
    attributes?: LogAttributesInput,
    message?: string,
    observedTime?: number,
    telemetry?: JsonObject,
    patch?: PatchTelemetry,
    crdt?: CrdtUpdateTelemetry
  ): LogRecord | undefined {
    const severity = severityNumber(level);
    const sampledLevel = this.shouldWrite(severity, name);
    if (sampledLevel === undefined) return undefined;
    const record = this.makeRecord(severity, sampledLevel, name, attributes, message, observedTime, telemetry, patch, crdt);
    const prepared = this.controls.sanitize || this.controls.maxPayloadBytes !== undefined ? this.prepareRecord(record) : record;
    this.write(prepared);
    return prepared;
  }

  trace(name: string, attributes?: LogAttributesInput, message?: string): LogRecord | undefined {
    return this.event('trace', name, attributes, message);
  }

  debug(name: string, attributes?: LogAttributesInput, message?: string): LogRecord | undefined {
    return this.event('debug', name, attributes, message);
  }

  info(name: string, attributes?: LogAttributesInput, message?: string): LogRecord | undefined {
    return this.event('info', name, attributes, message);
  }

  warn(name: string, attributes?: LogAttributesInput, message?: string): LogRecord | undefined {
    return this.event('warn', name, attributes, message);
  }

  error(name: string, attributes?: LogAttributesInput, message?: string): LogRecord | undefined {
    return this.event('error', name, attributes, message);
  }

  fatal(name: string, attributes?: LogAttributesInput, message?: string): LogRecord | undefined {
    return this.event('fatal', name, attributes, message);
  }

  flush(): void {
    for (let i = 0, length = this.sinks.length; i < length; i++) this.sinks[i].flush?.();
  }

  snapshot(): LogRecord[] {
    if (this.buffer) return this.buffer.snapshot();
    for (let i = 0, length = this.sinks.length; i < length; i++) {
      const snapshot = this.sinks[i].snapshot?.();
      if (snapshot) return snapshot;
    }
    return [];
  }

  clear(): void {
    for (let i = 0, length = this.sinks.length; i < length; i++) this.sinks[i].clear?.();
  }

  private shouldWrite(severity: number, name: string): LogLevel | undefined {
    if (severity < this.severityNumber) return undefined;
    let level: LogLevel | undefined;
    if (this.controls.sample) {
      level = levelName(severity);
      if (!this.controls.sample({ level, severityNumber: severity, name })) return undefined;
    }
    if (this.controls.sampleRate < 1 && this.controls.random() >= this.controls.sampleRate) return undefined;
    return level || levelName(severity);
  }

  private makeRecord(
    severity: number,
    level: LogLevel,
    name: string,
    attributes?: LogAttributesInput,
    message?: string,
    observedTime?: number,
    telemetry?: JsonObject,
    patch?: PatchTelemetry,
    crdt?: CrdtUpdateTelemetry
  ): LogRecord {
    const attrs = readAttributes(attributes);
    const merged = mergeObjects(this.context, attrs);
    const record: LogRecord = {
      time: this.now(),
      level,
      severityNumber: severity,
      name
    };
    if (message !== undefined) record.message = message;
    if (observedTime !== undefined) record.observedTime = observedTime;
    if (this.traceId) record.traceId = this.traceId;
    if (this.spanId) record.spanId = this.spanId;
    if (this.parentSpanId) record.parentSpanId = this.parentSpanId;
    if (this.resource) record.resource = this.resource;
    if (this.scope !== undefined) record.scope = this.scope;
    if (merged) record.attributes = merged;
    if (telemetry !== undefined) record.telemetry = telemetry;
    if (patch !== undefined) record.patch = patch;
    if (crdt !== undefined) record.crdt = crdt;
    return record;
  }

  private prepareRecord(record: LogRecord): LogRecord {
    let out = record;
    if (this.controls.sanitize) out = sanitizeRecord(out, this.controls);
    if (this.controls.maxPayloadBytes !== undefined) out = enforceMaxPayloadBytes(out, this.controls.maxPayloadBytes);
    return out;
  }

  private write(record: LogRecord): void {
    for (let i = 0, length = this.sinks.length; i < length; i++) this.sinks[i].write(record);
  }
}

class FrontierSpanImpl implements LogSpan {
  private ended = false;

  constructor(
    readonly name: string,
    readonly traceId: string,
    readonly spanId: string,
    readonly parentSpanId: string | undefined,
    readonly startTime: number,
    readonly logger: FrontierLogger,
    private readonly now: () => number
  ) {}

  event(level: LogLevelInput, name: string, attributes?: LogAttributesInput, message?: string): LogRecord | undefined {
    return this.logger.event(level, name, attributes, message);
  }

  record(level: LogLevelInput, name: string, options?: LogEventOptions): LogRecord | undefined {
    return this.logger.record(level, name, options);
  }

  end(attributes?: LogAttributesInput): LogRecord | undefined {
    if (this.ended) return undefined;
    this.ended = true;
    const endTime = this.now();
    const durationMs = Math.max(0, endTime - this.startTime);
    const record = this.logger.event('trace', this.name, mergeAttributeInput(attributes, { phase: 'end', durationMs }));
    if (record) record.durationMs = durationMs;
    return record;
  }
}

class RingLogBuffer implements LogBuffer {
  private readonly records: Array<LogRecord | undefined>;
  private next = 0;
  private count = 0;
  private droppedCount = 0;
  private writeCount = 0;

  constructor(readonly capacity: number) {
    this.records = new Array(capacity);
  }

  get size(): number {
    return this.count;
  }

  get dropped(): number {
    return this.droppedCount;
  }

  get writes(): number {
    return this.writeCount;
  }

  write(record: LogRecord): void {
    if (this.count === this.capacity) this.droppedCount++;
    else this.count++;
    this.records[this.next] = record;
    this.next = (this.next + 1) % this.capacity;
    this.writeCount++;
  }

  snapshot(): LogRecord[] {
    const out = new Array<LogRecord>(this.count);
    const start = this.count === this.capacity ? this.next : 0;
    for (let i = 0; i < this.count; i++) {
      out[i] = this.records[(start + i) % this.capacity] as LogRecord;
    }
    return out;
  }

  clear(): void {
    this.records.fill(undefined);
    this.next = 0;
    this.count = 0;
    this.droppedCount = 0;
    this.writeCount = 0;
  }
}

function createControls(options: LoggerOptions): LoggerControls {
  const sampleRate = options.sampleRate === undefined ? 1 : Math.max(0, Math.min(1, Number(options.sampleRate)));
  const controls: LoggerControls = {
    sampleRate,
    sample: options.sample,
    random: options.random || Math.random,
    sanitize: false,
    redactKeys: options.redactKeys || [],
    redactPaths: options.redactPaths || [],
    redactValue: options.redactValue === undefined ? '[redacted]' : options.redactValue,
    maxStringLength: readOptionalPositiveInt(options.maxStringLength),
    maxAttributeDepth: readOptionalPositiveInt(options.maxAttributeDepth),
    maxPayloadBytes: readOptionalPositiveInt(options.maxPayloadBytes)
  };
  controls.sanitize = controls.redactKeys.length > 0 ||
    controls.redactPaths.length > 0 ||
    controls.maxStringLength !== undefined ||
    controls.maxAttributeDepth !== undefined;
  return controls;
}

function normalizeSinks(sinks: LogSink | readonly LogSink[] | undefined, buffer: LogBuffer | null): LogSink[] {
  const out: LogSink[] = [];
  if (buffer) out[out.length] = buffer;
  if (sinks) {
    if (Array.isArray(sinks)) {
      for (let i = 0, length = sinks.length; i < length; i++) out[out.length] = sinks[i];
    } else {
      out[out.length] = sinks as LogSink;
    }
  }
  return out;
}

function severityNumber(level: LogLevelInput): number {
  if (typeof level === 'number') {
    if (!Number.isFinite(level)) throw new Error('log level number must be finite');
    return level;
  }
  const value = LOG_LEVELS[level];
  if (value === undefined) throw new Error('unknown log level: ' + level);
  return value;
}

function levelName(severity: number): LogLevel {
  let selected = LOG_LEVEL_NAMES[0];
  for (let i = 0, length = LOG_LEVEL_NAMES.length; i < length; i++) {
    const name = LOG_LEVEL_NAMES[i];
    if (severity >= LOG_LEVELS[name]) selected = name;
  }
  return selected;
}

function readAttributes(input: LogAttributesInput): JsonObject | undefined {
  if (input === undefined) return undefined;
  return cloneJsonObject(typeof input === 'function' ? input() : input);
}

function mergeAttributeInput(input: LogAttributesInput, extra: JsonObject): LogAttributesInput {
  return () => mergeObjects(readAttributes(input), extra) || extra;
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

function cloneJsonObject(value: JsonObject | undefined): JsonObject | undefined {
  if (value === undefined) return undefined;
  const out: JsonObject = {};
  for (const key of Object.keys(value)) out[key] = value[key];
  return out;
}

function createIdSource(): () => string {
  let counter = 0;
  const prefix = Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0');
  return () => prefix + (++counter).toString(16).padStart(8, '0');
}

function createTraceId(): string {
  const time = Date.now().toString(16).padStart(12, '0').slice(-12);
  const a = Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0');
  const b = Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0');
  const c = Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0');
  return time + a + b + c.slice(0, 4);
}

function readOptionalPositiveInt(value: number | undefined): number | undefined {
  if (value === undefined) return undefined;
  const number = Math.floor(Number(value));
  return Number.isFinite(number) && number >= 0 ? number : undefined;
}

function sanitizeRecord(record: LogRecord, controls: LoggerControls): LogRecord {
  const out: LogRecord = { ...record };
  if (record.resource !== undefined) out.resource = sanitizeJsonObject(record.resource, controls, 'resource', 0);
  if (record.attributes !== undefined) out.attributes = sanitizeJsonObject(record.attributes, controls, 'attributes', 0);
  if (record.telemetry !== undefined) out.telemetry = sanitizeJsonObject(record.telemetry, controls, 'telemetry', 0);
  if (record.patch !== undefined) out.patch = sanitizeJsonObject(record.patch as unknown as JsonObject, controls, 'patch', 0) as unknown as PatchTelemetry;
  if (record.crdt !== undefined) out.crdt = sanitizeJsonObject(record.crdt as unknown as JsonObject, controls, 'crdt', 0) as unknown as CrdtUpdateTelemetry;
  if (record.message !== undefined && controls.maxStringLength !== undefined) {
    out.message = truncateString(record.message, controls.maxStringLength);
  }
  return out;
}

function sanitizeJsonObject(value: JsonObject, controls: LoggerControls, path: string, depth: number): JsonObject {
  const maxDepth = controls.maxAttributeDepth;
  if (maxDepth !== undefined && depth > maxDepth) return { truncated: true };
  const out: JsonObject = {};
  for (const key of Object.keys(value)) {
    const childPath = path + '.' + key;
    out[key] = shouldRedact(key, childPath, controls)
      ? controls.redactValue
      : sanitizeJsonValue(value[key], controls, childPath, depth + 1);
  }
  return out;
}

function sanitizeJsonValue(value: JsonValue, controls: LoggerControls, path: string, depth: number): JsonValue {
  if (typeof value === 'string') {
    return controls.maxStringLength === undefined ? value : truncateString(value, controls.maxStringLength);
  }
  if (value === null || typeof value !== 'object') return value;
  const maxDepth = controls.maxAttributeDepth;
  if (maxDepth !== undefined && depth > maxDepth) return TRUNCATED_VALUE;
  if (Array.isArray(value)) {
    const out: JsonArray = [];
    for (let i = 0, length = value.length; i < length; i++) out[i] = sanitizeJsonValue(value[i], controls, path + '.' + i, depth + 1);
    return out;
  }
  return sanitizeJsonObject(value, controls, path, depth);
}

function shouldRedact(key: string, path: string, controls: LoggerControls): boolean {
  return matchesAny(key, controls.redactKeys) || matchesAny(path, controls.redactPaths);
}

function matchesAny(value: string, matchers: readonly LogRedactMatcher[]): boolean {
  for (let i = 0, length = matchers.length; i < length; i++) {
    const matcher = matchers[i];
    if (typeof matcher === 'string') {
      if (matcher === value) return true;
    } else {
      matcher.lastIndex = 0;
      if (matcher.test(value)) return true;
    }
  }
  return false;
}

function truncateString(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return value.slice(0, Math.max(0, maxLength)) + TRUNCATED_VALUE;
}

function enforceMaxPayloadBytes(record: LogRecord, limit: number): LogRecord {
  const byteLength = jsonByteLength(record);
  if (byteLength <= limit) return record;
  const out: LogRecord = { ...record };
  const marker: JsonObject = { truncated: true, byteLength, limit };
  if (out.attributes !== undefined) out.attributes = marker;
  if (out.telemetry !== undefined) out.telemetry = marker;
  if (out.patch !== undefined) out.patch = {
    kind: 'patch',
    opCount: 0,
    operationTypes: marker,
    pathCount: 0,
    maxPathDepth: 0,
    pathSamples: []
  };
  if (out.crdt !== undefined) out.crdt = {
    kind: 'crdt-update',
    byteLength,
    actor: '',
    seq: 0,
    opCount: 0,
    logicalOpCount: 0,
    actors: [],
    heads: [],
    stateVector: {},
    operationTypes: marker,
    pathCount: 0,
    maxPathDepth: 0,
    pathSamples: []
  };
  if (out.message !== undefined && out.message.length > 128) out.message = out.message.slice(0, 128) + TRUNCATED_VALUE;
  if (jsonByteLength(out) > limit) {
    delete out.message;
    delete out.telemetry;
    delete out.patch;
    delete out.crdt;
    if (out.attributes !== undefined) out.attributes = marker;
  }
  return out;
}

function jsonByteLength(value: unknown): number {
  return textEncoder.encode(JSON.stringify(value)).byteLength;
}

function createDictionary(): { values: string[]; index: Map<string, number>; intern(value: string): number } {
  return {
    values: [],
    index: new Map<string, number>(),
    intern(value: string) {
      const existing = this.index.get(value);
      if (existing !== undefined) return existing;
      const next = this.values.length;
      this.values[next] = value;
      this.index.set(value, next);
      return next;
    }
  };
}

function compactRecord(record: LogRecord, keyTable: ReturnType<typeof createDictionary>, pathTable: ReturnType<typeof createDictionary>): CompactLogRecord {
  const out: CompactLogRecord = {
    t: record.time,
    l: record.severityNumber
  };
  if (record.observedTime !== undefined) out.o = record.observedTime;
  if (record.name !== undefined) out.n = record.name;
  if (record.message !== undefined) out.m = record.message;
  if (record.traceId !== undefined) out.tr = record.traceId;
  if (record.spanId !== undefined) out.s = record.spanId;
  if (record.parentSpanId !== undefined) out.ps = record.parentSpanId;
  if (record.durationMs !== undefined) out.d = record.durationMs;
  if (record.resource !== undefined) out.r = compactAttributes(record.resource, keyTable);
  if (record.scope !== undefined) out.sc = record.scope;
  if (record.attributes !== undefined) out.a = compactAttributes(record.attributes, keyTable);
  if (record.telemetry !== undefined) out.te = compactAttributes(record.telemetry, keyTable);
  if (record.patch !== undefined) out.p = compactPatchTelemetry(record.patch, keyTable, pathTable);
  if (record.crdt !== undefined) out.c = compactCrdtTelemetry(record.crdt, keyTable, pathTable);
  return out;
}

function compactAttributes(attributes: JsonObject, keyTable: ReturnType<typeof createDictionary>): CompactAttributes {
  const keys = Object.keys(attributes);
  const out = new Array<[number, JsonValue]>(keys.length);
  for (let i = 0, length = keys.length; i < length; i++) {
    const key = keys[i];
    out[i] = [keyTable.intern(key), attributes[key]];
  }
  return out;
}

function compactPatchTelemetry(input: PatchTelemetry, keyTable: ReturnType<typeof createDictionary>, pathTable: ReturnType<typeof createDictionary>): CompactPatchTelemetry {
  const out: CompactPatchTelemetry = {
    o: input.opCount,
    k: compactAttributes(input.operationTypes, keyTable),
    pc: input.pathCount,
    md: input.maxPathDepth,
    ps: input.pathSamples.map((path) => pathTable.intern(path))
  };
  if (input.byteLength !== undefined) out.b = input.byteLength;
  return out;
}

function compactCrdtTelemetry(input: CrdtUpdateTelemetry, keyTable: ReturnType<typeof createDictionary>, pathTable: ReturnType<typeof createDictionary>): CompactCrdtTelemetry {
  return {
    b: input.byteLength,
    a: input.actor,
    s: input.seq,
    o: input.opCount,
    lo: input.logicalOpCount,
    aa: input.actors,
    h: input.heads,
    sv: input.stateVector,
    k: compactAttributes(input.operationTypes, keyTable),
    pc: input.pathCount,
    md: input.maxPathDepth,
    ps: input.pathSamples.map((path) => pathTable.intern(path))
  };
}

function expandRecord(record: CompactLogRecord, keys: string[], paths: string[]): LogRecord {
  const out: LogRecord = {
    time: record.t,
    level: levelName(record.l),
    severityNumber: record.l
  };
  if (record.o !== undefined) out.observedTime = record.o;
  if (record.n !== undefined) out.name = record.n;
  if (record.m !== undefined) out.message = record.m;
  if (record.tr !== undefined) out.traceId = record.tr;
  if (record.s !== undefined) out.spanId = record.s;
  if (record.ps !== undefined) out.parentSpanId = record.ps;
  if (record.d !== undefined) out.durationMs = record.d;
  if (record.r !== undefined) out.resource = expandAttributes(record.r, keys);
  if (record.sc !== undefined) out.scope = record.sc;
  if (record.a !== undefined) out.attributes = expandAttributes(record.a, keys);
  if (record.te !== undefined) out.telemetry = expandAttributes(record.te, keys);
  if (record.p !== undefined) out.patch = expandPatchTelemetry(record.p, keys, paths);
  if (record.c !== undefined) out.crdt = expandCrdtTelemetry(record.c, keys, paths);
  return out;
}

function expandAttributes(input: CompactAttributes, keys: string[]): JsonObject {
  const out: JsonObject = {};
  for (let i = 0, length = input.length; i < length; i++) out[keys[input[i][0]]] = input[i][1];
  return out;
}

function expandPatchTelemetry(input: CompactPatchTelemetry, keys: string[], paths: string[]): PatchTelemetry {
  const out: PatchTelemetry = {
    kind: 'patch',
    opCount: input.o,
    operationTypes: expandAttributes(input.k, keys),
    pathCount: input.pc,
    maxPathDepth: input.md,
    pathSamples: input.ps.map((index) => paths[index])
  };
  if (input.b !== undefined) out.byteLength = input.b;
  return out;
}

function expandCrdtTelemetry(input: CompactCrdtTelemetry, keys: string[], paths: string[]): CrdtUpdateTelemetry {
  return {
    kind: 'crdt-update',
    byteLength: input.b,
    actor: input.a,
    seq: input.s,
    opCount: input.o,
    logicalOpCount: input.lo,
    actors: input.aa,
    heads: input.h,
    stateVector: input.sv,
    operationTypes: expandAttributes(input.k, keys),
    pathCount: input.pc,
    maxPathDepth: input.md,
    pathSamples: input.ps.map((index) => paths[index])
  };
}

function isCompactLogBatch(value: unknown): value is CompactLogBatch {
  return typeof value === 'object' && value !== null && (value as CompactLogBatch).version === 1 && Array.isArray((value as CompactLogBatch).records);
}
