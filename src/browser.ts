import type { JsonObject, JsonValue } from '@shapeshift-labs/frontier/types';
import type { LogLevel, LogRecord, LogSink } from './logging.js';

export type BrowserTelemetryKind =
  | 'breadcrumb'
  | 'console'
  | 'network'
  | 'navigation'
  | 'interaction'
  | 'error'
  | 'replay';

export interface BrowserTelemetryEvent {
  time: number;
  kind: BrowserTelemetryKind;
  category?: string;
  level?: LogLevel;
  message?: string;
  url?: string;
  method?: string;
  status?: number;
  durationMs?: number;
  attributes?: JsonObject;
  data?: JsonObject;
}

export type BrowserTelemetryInput =
  | BrowserTelemetryEvent
  | BrowserBreadcrumbInput
  | BrowserNetworkTelemetryInput
  | BrowserReplayTelemetryInput;

export interface BrowserBreadcrumbInput {
  time?: number;
  kind?: BrowserTelemetryKind;
  category?: string;
  level?: LogLevel;
  message?: string;
  attributes?: JsonObject;
  data?: JsonObject;
}

export interface BrowserHeaderBag {
  [name: string]: JsonValue;
}

export interface BrowserRequestResponseData {
  headers?: BrowserHeaderBag;
  body?: JsonValue;
}

export interface BrowserNetworkTelemetryInput {
  time?: number;
  kind?: 'network';
  url: string;
  method?: string;
  status?: number;
  durationMs?: number;
  request?: BrowserRequestResponseData;
  response?: BrowserRequestResponseData;
  attributes?: JsonObject;
}

export interface BrowserReplayTelemetryInput {
  time?: number;
  kind?: 'replay';
  category?: string;
  message?: string;
  data?: JsonObject;
  attributes?: JsonObject;
}

export type BrowserTelemetryMatcher = string | RegExp;

export interface BrowserTelemetryPrivacyOptions {
  privateMode?: boolean;
  capturePayload?: boolean;
  stripUrlQuery?: boolean;
  maskEmails?: boolean;
  maskLongNumbers?: boolean;
  ignoredHeaders?: readonly string[] | true | false;
  denyUrls?: readonly BrowserTelemetryMatcher[];
  allowUrls?: readonly BrowserTelemetryMatcher[];
  serviceUrls?: readonly BrowserTelemetryMatcher[];
  redactKeys?: readonly BrowserTelemetryMatcher[];
  redactValue?: JsonValue;
  maxStringLength?: number;
  maxAttributeDepth?: number;
  maxPayloadBytes?: number;
}

export interface BrowserTelemetryBufferOptions extends BrowserTelemetryPrivacyOptions {
  sessionId?: string;
  capacity?: number;
  maxBytes?: number;
  now?: () => number;
}

export interface BrowserTelemetryBuffer {
  readonly sessionId: string;
  readonly capacity: number;
  readonly size: number;
  readonly dropped: number;
  readonly byteLength: number;
  record(input: BrowserTelemetryInput): BrowserTelemetryEvent | undefined;
  breadcrumb(input: BrowserBreadcrumbInput): BrowserTelemetryEvent | undefined;
  network(input: BrowserNetworkTelemetryInput): BrowserTelemetryEvent | undefined;
  replay(input: BrowserReplayTelemetryInput): BrowserTelemetryEvent | undefined;
  snapshot(): BrowserTelemetryEvent[];
  flush(): BrowserTelemetryEvent[];
  clear(): void;
}

export interface BrowserStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

export interface BrowserOfflineTelemetryBuffer extends BrowserTelemetryBuffer {
  readonly key: string;
  readonly storageErrors: number;
  persist(): void;
}

export interface BrowserOfflineTelemetryOptions extends BrowserTelemetryBufferOptions {
  storage: BrowserStorageLike;
  key?: string;
  persistOnWrite?: boolean;
}

export interface BrowserBreadcrumbLogSinkOptions extends BrowserTelemetryBufferOptions {
  buffer?: BrowserTelemetryBuffer;
  category?: string;
  includeAttributes?: boolean;
  includeTelemetry?: boolean;
}

export interface BrowserBreadcrumbLogSink extends LogSink {
  readonly buffer: BrowserTelemetryBuffer;
  telemetrySnapshot(): BrowserTelemetryEvent[];
}

export interface CompactBrowserTelemetryBatch {
  version: 1;
  generatedAt: number;
  sessionId?: string;
  dropped?: number;
  strings: string[];
  events: CompactBrowserTelemetryEvent[];
}

export type CompactBrowserTelemetryEvent = {
  t: number;
  k: number;
  c?: number;
  l?: number;
  m?: number;
  u?: number;
  me?: number;
  s?: number;
  d?: number;
  a?: JsonObject;
  da?: JsonObject;
};

interface BrowserTelemetryControls {
  privateMode: boolean;
  capturePayload: boolean;
  stripUrlQuery: boolean;
  maskEmails: boolean;
  maskLongNumbers: boolean;
  ignoredHeaders: readonly string[] | true | false;
  denyUrls: readonly BrowserTelemetryMatcher[];
  allowUrls: readonly BrowserTelemetryMatcher[];
  serviceUrls: readonly BrowserTelemetryMatcher[];
  redactKeys: readonly BrowserTelemetryMatcher[];
  redactValue: JsonValue;
  maxStringLength: number | undefined;
  maxAttributeDepth: number | undefined;
  maxPayloadBytes: number | undefined;
}

const DEFAULT_BROWSER_TELEMETRY_KEY = 'frontier.browserTelemetry.v1';
const DEFAULT_BUFFER_CAPACITY = 256;
const DEFAULT_MAX_BYTES = 128 * 1024;
const DEFAULT_MAX_STRING_LENGTH = 512;
const DEFAULT_MAX_ATTRIBUTE_DEPTH = 6;
const DEFAULT_REDACT_VALUE = '[redacted]';
const DEFAULT_IGNORED_HEADERS = [
  'authorization',
  'cookie',
  'set-cookie',
  'proxy-authorization',
  'x-api-key',
  'x-auth-token',
  'x-csrf-token'
];
const DEFAULT_REDACT_KEYS: BrowserTelemetryMatcher[] = [
  'password',
  'passwd',
  'secret',
  'token',
  'authorization',
  'cookie',
  'set-cookie',
  'apiKey',
  'api_key',
  'session',
  'sessionId'
];
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export function createBrowserTelemetryBuffer(options: BrowserTelemetryBufferOptions = {}): BrowserTelemetryBuffer {
  return new BrowserTelemetryRingBuffer(options);
}

export function createBrowserOfflineTelemetryBuffer(
  options: BrowserOfflineTelemetryOptions
): BrowserOfflineTelemetryBuffer {
  return new BrowserOfflineTelemetryRingBuffer(options);
}

export function createBrowserBreadcrumbLogSink(
  options: BrowserBreadcrumbLogSinkOptions = {}
): BrowserBreadcrumbLogSink {
  const buffer = options.buffer || createBrowserTelemetryBuffer(options);
  return {
    buffer,
    write(record) {
      buffer.breadcrumb(logRecordToBreadcrumb(record, options));
    },
    flush() {},
    clear() {
      buffer.clear();
    },
    telemetrySnapshot() {
      return buffer.snapshot();
    }
  };
}

export function sanitizeBrowserTelemetryEvent(
  input: BrowserTelemetryInput,
  options: BrowserTelemetryPrivacyOptions = {}
): BrowserTelemetryEvent | undefined {
  const controls = createBrowserTelemetryControls(options);
  const event = normalizeBrowserTelemetryInput(input);
  if (event.kind === 'network' && event.url !== undefined && shouldFilterUrl(event.url, controls)) {
    return undefined;
  }
  const sanitized = sanitizeBrowserEvent(event, controls);
  if (controls.maxPayloadBytes !== undefined) return enforceBrowserPayloadLimit(sanitized, controls.maxPayloadBytes);
  return sanitized;
}

export function compactBrowserTelemetryBatch(
  events: readonly BrowserTelemetryEvent[],
  options: { sessionId?: string; dropped?: number; now?: number } = {}
): CompactBrowserTelemetryBatch {
  const dictionary = createStringDictionary();
  const compactEvents = new Array<CompactBrowserTelemetryEvent>(events.length);
  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const row: CompactBrowserTelemetryEvent = {
      t: event.time,
      k: dictionary.id(event.kind)
    };
    if (event.category !== undefined) row.c = dictionary.id(event.category);
    if (event.level !== undefined) row.l = dictionary.id(event.level);
    if (event.message !== undefined) row.m = dictionary.id(event.message);
    if (event.url !== undefined) row.u = dictionary.id(event.url);
    if (event.method !== undefined) row.me = dictionary.id(event.method);
    if (event.status !== undefined) row.s = event.status;
    if (event.durationMs !== undefined) row.d = event.durationMs;
    if (event.attributes !== undefined) row.a = event.attributes;
    if (event.data !== undefined) row.da = event.data;
    compactEvents[i] = row;
  }
  const batch: CompactBrowserTelemetryBatch = {
    version: 1,
    generatedAt: options.now === undefined ? Date.now() : options.now,
    strings: dictionary.values,
    events: compactEvents
  };
  if (options.sessionId !== undefined) batch.sessionId = options.sessionId;
  if (options.dropped !== undefined && options.dropped !== 0) batch.dropped = options.dropped;
  return batch;
}

export function expandBrowserTelemetryBatch(batch: CompactBrowserTelemetryBatch): BrowserTelemetryEvent[] {
  if (!batch || batch.version !== 1 || !Array.isArray(batch.events) || !Array.isArray(batch.strings)) {
    throw new Error('invalid Frontier browser telemetry batch');
  }
  const out = new Array<BrowserTelemetryEvent>(batch.events.length);
  for (let i = 0; i < batch.events.length; i++) {
    const row = batch.events[i];
    const event: BrowserTelemetryEvent = {
      time: row.t,
      kind: readString(batch.strings, row.k) as BrowserTelemetryKind
    };
    if (row.c !== undefined) event.category = readString(batch.strings, row.c);
    if (row.l !== undefined) event.level = readString(batch.strings, row.l) as LogLevel;
    if (row.m !== undefined) event.message = readString(batch.strings, row.m);
    if (row.u !== undefined) event.url = readString(batch.strings, row.u);
    if (row.me !== undefined) event.method = readString(batch.strings, row.me);
    if (row.s !== undefined) event.status = row.s;
    if (row.d !== undefined) event.durationMs = row.d;
    if (row.a !== undefined) event.attributes = row.a;
    if (row.da !== undefined) event.data = row.da;
    out[i] = event;
  }
  return out;
}

export function encodeBrowserTelemetryBatch(
  events: readonly BrowserTelemetryEvent[],
  options?: { sessionId?: string; dropped?: number; now?: number }
): Uint8Array {
  return textEncoder.encode(JSON.stringify(compactBrowserTelemetryBatch(events, options)));
}

export function decodeBrowserTelemetryBatch(
  input: string | ArrayBuffer | ArrayBufferView | CompactBrowserTelemetryBatch
): BrowserTelemetryEvent[] {
  if (typeof input === 'string') return expandBrowserTelemetryBatch(JSON.parse(input) as CompactBrowserTelemetryBatch);
  if (isCompactBrowserTelemetryBatch(input)) return expandBrowserTelemetryBatch(input);
  const bytes = input instanceof ArrayBuffer
    ? new Uint8Array(input)
    : new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  return expandBrowserTelemetryBatch(JSON.parse(textDecoder.decode(bytes)) as CompactBrowserTelemetryBatch);
}

class BrowserTelemetryRingBuffer implements BrowserTelemetryBuffer {
  readonly sessionId: string;
  readonly capacity: number;
  protected readonly maxBytes: number;
  protected readonly now: () => number;
  protected readonly controls: BrowserTelemetryControls;
  protected readonly records: Array<BrowserTelemetryEvent | undefined>;
  protected next = 0;
  protected count = 0;
  protected droppedCount = 0;
  protected bytes = 0;

  constructor(options: BrowserTelemetryBufferOptions = {}) {
    this.sessionId = options.sessionId || createBrowserTelemetrySessionId();
    this.capacity = Math.max(1, Math.floor(options.capacity || DEFAULT_BUFFER_CAPACITY));
    this.maxBytes = Math.max(1, Math.floor(options.maxBytes || DEFAULT_MAX_BYTES));
    this.now = options.now || Date.now;
    this.controls = createBrowserTelemetryControls(options);
    this.records = new Array(this.capacity);
  }

  get size(): number {
    return this.count;
  }

  get dropped(): number {
    return this.droppedCount;
  }

  get byteLength(): number {
    return this.bytes;
  }

  record(input: BrowserTelemetryInput): BrowserTelemetryEvent | undefined {
    const event = this.prepare(input);
    if (event === undefined) return undefined;
    this.append(event);
    return event;
  }

  breadcrumb(input: BrowserBreadcrumbInput): BrowserTelemetryEvent | undefined {
    return this.record({ ...input, kind: input.kind || 'breadcrumb' });
  }

  network(input: BrowserNetworkTelemetryInput): BrowserTelemetryEvent | undefined {
    return this.record({ ...input, kind: 'network' });
  }

  replay(input: BrowserReplayTelemetryInput): BrowserTelemetryEvent | undefined {
    return this.record({ ...input, kind: 'replay' });
  }

  snapshot(): BrowserTelemetryEvent[] {
    const out = new Array<BrowserTelemetryEvent>(this.count);
    const start = this.oldestIndex();
    for (let i = 0; i < this.count; i++) out[i] = this.records[(start + i) % this.capacity] as BrowserTelemetryEvent;
    return out;
  }

  flush(): BrowserTelemetryEvent[] {
    const out = this.snapshot();
    this.clear();
    return out;
  }

  clear(): void {
    this.records.fill(undefined);
    this.next = 0;
    this.count = 0;
    this.droppedCount = 0;
    this.bytes = 0;
  }

  protected prepare(input: BrowserTelemetryInput): BrowserTelemetryEvent | undefined {
    const event = normalizeBrowserTelemetryInput(input, this.now);
    if (event.kind === 'network' && event.url !== undefined && shouldFilterUrl(event.url, this.controls)) {
      return undefined;
    }
    const sanitized = sanitizeBrowserEvent(event, this.controls);
    return this.controls.maxPayloadBytes === undefined
      ? sanitized
      : enforceBrowserPayloadLimit(sanitized, this.controls.maxPayloadBytes);
  }

  protected append(event: BrowserTelemetryEvent): void {
    const eventBytes = jsonByteLength(event);
    if (eventBytes > this.maxBytes) {
      this.droppedCount++;
      return;
    }
    while (this.count > 0 && this.bytes + eventBytes > this.maxBytes) this.dropOldest();
    if (this.count === this.capacity) this.dropOldest();
    this.records[this.next] = event;
    this.next = (this.next + 1) % this.capacity;
    this.count++;
    this.bytes += eventBytes;
  }

  protected dropOldest(): void {
    if (this.count === 0) return;
    const index = this.oldestIndex();
    const record = this.records[index];
    if (record) this.bytes -= jsonByteLength(record);
    this.records[index] = undefined;
    this.count--;
    this.droppedCount++;
    if (this.bytes < 0) this.bytes = 0;
  }

  protected oldestIndex(): number {
    return (this.next - this.count + this.capacity) % this.capacity;
  }
}

class BrowserOfflineTelemetryRingBuffer extends BrowserTelemetryRingBuffer implements BrowserOfflineTelemetryBuffer {
  readonly key: string;
  private readonly storage: BrowserStorageLike;
  private readonly persistOnWrite: boolean;
  private errorCount = 0;

  constructor(options: BrowserOfflineTelemetryOptions) {
    super(options);
    this.storage = options.storage;
    this.key = options.key || DEFAULT_BROWSER_TELEMETRY_KEY;
    this.persistOnWrite = options.persistOnWrite !== false;
    this.restore();
  }

  get storageErrors(): number {
    return this.errorCount;
  }

  override record(input: BrowserTelemetryInput): BrowserTelemetryEvent | undefined {
    const event = super.record(input);
    if (event !== undefined && this.persistOnWrite) this.persist();
    return event;
  }

  override clear(): void {
    super.clear();
    try {
      if (this.storage.removeItem) this.storage.removeItem(this.key);
      else this.storage.setItem(this.key, '');
    } catch {
      this.errorCount++;
    }
  }

  persist(): void {
    try {
      const batch = compactBrowserTelemetryBatch(this.snapshot(), {
        sessionId: this.sessionId,
        dropped: this.dropped,
        now: this.now()
      });
      this.storage.setItem(this.key, JSON.stringify(batch));
    } catch {
      this.errorCount++;
    }
  }

  private restore(): void {
    let text: string | null = null;
    try {
      text = this.storage.getItem(this.key);
    } catch {
      this.errorCount++;
      return;
    }
    if (!text) return;
    try {
      const events = decodeBrowserTelemetryBatch(text);
      for (let i = 0; i < events.length; i++) super.append(events[i]);
    } catch {
      this.errorCount++;
    }
  }
}

function normalizeBrowserTelemetryInput(input: BrowserTelemetryInput, now: () => number = Date.now): BrowserTelemetryEvent {
  const time = Number.isFinite(input.time) ? Number(input.time) : now();
  const kind = input.kind || 'breadcrumb';
  const event: BrowserTelemetryEvent = { time, kind };
  if ('category' in input && input.category !== undefined) event.category = String(input.category);
  if ('level' in input && input.level !== undefined) event.level = input.level;
  if ('message' in input && input.message !== undefined) event.message = String(input.message);
  if ('url' in input && input.url !== undefined) event.url = String(input.url);
  if ('method' in input && input.method !== undefined) event.method = String(input.method).toUpperCase();
  if ('status' in input && input.status !== undefined && Number.isFinite(input.status)) event.status = Math.floor(Number(input.status));
  if ('durationMs' in input && input.durationMs !== undefined && Number.isFinite(input.durationMs)) {
    event.durationMs = Math.max(0, Number(input.durationMs));
  }
  if ('attributes' in input && input.attributes !== undefined) event.attributes = input.attributes;
  if ('data' in input && input.data !== undefined) event.data = input.data;
  if (kind === 'network') {
    const network = input as BrowserNetworkTelemetryInput;
    event.data = {
      ...(event.data || {}),
      ...(network.request !== undefined ? { request: network.request as unknown as JsonValue } : {}),
      ...(network.response !== undefined ? { response: network.response as unknown as JsonValue } : {})
    };
  }
  return event;
}

function sanitizeBrowserEvent(event: BrowserTelemetryEvent, controls: BrowserTelemetryControls): BrowserTelemetryEvent {
  const out: BrowserTelemetryEvent = {
    time: event.time,
    kind: event.kind
  };
  if (event.category !== undefined) out.category = sanitizeText(event.category, controls);
  if (event.level !== undefined) out.level = event.level;
  if (event.message !== undefined) out.message = sanitizeText(event.message, controls);
  if (event.url !== undefined) out.url = sanitizeUrl(event.url, controls);
  if (event.method !== undefined) out.method = sanitizeText(event.method, controls);
  if (event.status !== undefined) out.status = event.status;
  if (event.durationMs !== undefined) out.durationMs = event.durationMs;
  if (event.attributes !== undefined) {
    out.attributes = sanitizeJsonObject(event.attributes, controls, 0, 'attributes');
  }
  if (event.data !== undefined) {
    out.data = event.kind === 'network'
      ? sanitizeNetworkData(event.data, controls)
      : sanitizeJsonObject(event.data, controls, 0, 'data');
  }
  return out;
}

function sanitizeNetworkData(data: JsonObject, controls: BrowserTelemetryControls): JsonObject {
  const out: JsonObject = {};
  const request = data.request;
  const response = data.response;
  if (request && typeof request === 'object' && !Array.isArray(request)) {
    out.request = sanitizeRequestResponseData(request as JsonObject, controls, 'request');
  }
  if (response && typeof response === 'object' && !Array.isArray(response)) {
    out.response = sanitizeRequestResponseData(response as JsonObject, controls, 'response');
  }
  for (const key of Object.keys(data)) {
    if (key === 'request' || key === 'response') continue;
    out[key] = sanitizeJson(data[key], controls, 0, 'data.' + key);
  }
  return out;
}

function sanitizeRequestResponseData(value: JsonObject, controls: BrowserTelemetryControls, path: string): JsonObject {
  const out: JsonObject = {};
  if (value.headers && typeof value.headers === 'object' && !Array.isArray(value.headers)) {
    out.headers = sanitizeHeaders(value.headers as JsonObject, controls);
  }
  if (controls.capturePayload && !controls.privateMode && value.body !== undefined) {
    out.body = sanitizeJson(value.body, controls, 0, path + '.body');
  }
  return out;
}

function sanitizeHeaders(headers: JsonObject, controls: BrowserTelemetryControls): JsonObject {
  const out: JsonObject = {};
  if (controls.privateMode || controls.ignoredHeaders === true) return out;
  const ignored = controls.ignoredHeaders === false ? [] : controls.ignoredHeaders;
  for (const key of Object.keys(headers)) {
    const lower = key.toLowerCase();
    if (ignored.some((name) => lower === name.toLowerCase())) {
      out[key] = controls.redactValue;
    } else {
      out[key] = sanitizeJson(headers[key], controls, 0, 'headers.' + key);
    }
  }
  return out;
}

function sanitizeJsonObject(value: JsonObject, controls: BrowserTelemetryControls, depth: number, path: string): JsonObject {
  const sanitized = sanitizeJson(value, controls, depth, path);
  return sanitized && typeof sanitized === 'object' && !Array.isArray(sanitized) ? sanitized as JsonObject : {};
}

function sanitizeJson(value: JsonValue, controls: BrowserTelemetryControls, depth: number, path: string): JsonValue {
  if (value === null || typeof value === 'boolean' || typeof value === 'number') return value;
  if (typeof value === 'string') return sanitizeText(value, controls);
  if (controls.maxAttributeDepth !== undefined && depth >= controls.maxAttributeDepth) return '[truncated]';
  if (Array.isArray(value)) {
    const out: JsonValue[] = new Array(value.length);
    for (let i = 0; i < value.length; i++) out[i] = sanitizeJson(value[i], controls, depth + 1, path + '.' + i);
    return out;
  }
  const out: JsonObject = {};
  for (const key of Object.keys(value)) {
    if (matchesAny(key, controls.redactKeys) || matchesAny(path + '.' + key, controls.redactKeys)) {
      out[key] = controls.redactValue;
    } else {
      out[key] = sanitizeJson(value[key], controls, depth + 1, path + '.' + key);
    }
  }
  return out;
}

function sanitizeText(input: string, controls: BrowserTelemetryControls): string {
  let text = controls.privateMode ? wipeText(input) : input;
  if (controls.maskEmails) text = text.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]');
  if (controls.maskLongNumbers) text = text.replace(/\d{4,}/g, '0000');
  if (controls.maxStringLength !== undefined && text.length > controls.maxStringLength) {
    text = text.slice(0, controls.maxStringLength) + '[truncated]';
  }
  return text;
}

function sanitizeUrl(input: string, controls: BrowserTelemetryControls): string {
  if (controls.privateMode) return controls.redactValue === undefined ? DEFAULT_REDACT_VALUE : String(controls.redactValue);
  let out = input;
  if (controls.stripUrlQuery) out = stripUrlQuery(out);
  return sanitizeText(out, controls);
}

function stripUrlQuery(input: string): string {
  const query = input.search(/[?#]/);
  return query === -1 ? input : input.slice(0, query);
}

function wipeText(input: string): string {
  return input.replace(/[^\s]/g, '*');
}

function shouldFilterUrl(url: string, controls: BrowserTelemetryControls): boolean {
  if (matchesAny(url, controls.serviceUrls)) return true;
  if (matchesAny(url, controls.denyUrls)) return true;
  return controls.allowUrls.length > 0 && !matchesAny(url, controls.allowUrls);
}

function enforceBrowserPayloadLimit(event: BrowserTelemetryEvent, maxPayloadBytes: number): BrowserTelemetryEvent {
  if (jsonByteLength(event) <= maxPayloadBytes) return event;
  const out: BrowserTelemetryEvent = {
    time: event.time,
    kind: event.kind
  };
  if (event.category !== undefined) out.category = event.category;
  if (event.level !== undefined) out.level = event.level;
  if (event.message !== undefined) out.message = event.message;
  if (event.url !== undefined) out.url = event.url;
  if (event.method !== undefined) out.method = event.method;
  if (event.status !== undefined) out.status = event.status;
  if (event.durationMs !== undefined) out.durationMs = event.durationMs;
  out.attributes = { truncated: true };
  return out;
}

function logRecordToBreadcrumb(record: LogRecord, options: BrowserBreadcrumbLogSinkOptions): BrowserBreadcrumbInput {
  const attributes: JsonObject = {};
  if (options.includeAttributes !== false && record.attributes !== undefined) {
    attributes.attributes = record.attributes;
  }
  if (options.includeTelemetry && record.telemetry !== undefined) {
    attributes.telemetry = record.telemetry;
  }
  if (record.patch !== undefined) attributes.patch = record.patch as unknown as JsonValue;
  if (record.crdt !== undefined) attributes.crdt = record.crdt as unknown as JsonValue;
  return {
    time: record.time,
    kind: record.name && record.name.startsWith('console.') ? 'console' : 'breadcrumb',
    category: options.category || record.scope || 'frontier.log',
    level: record.level,
    message: record.message || record.name,
    attributes
  };
}

function createBrowserTelemetryControls(options: BrowserTelemetryPrivacyOptions): BrowserTelemetryControls {
  return {
    privateMode: options.privateMode === true,
    capturePayload: options.capturePayload === true,
    stripUrlQuery: options.stripUrlQuery !== false,
    maskEmails: options.maskEmails !== false,
    maskLongNumbers: options.maskLongNumbers !== false,
    ignoredHeaders: options.ignoredHeaders === undefined ? DEFAULT_IGNORED_HEADERS : options.ignoredHeaders,
    denyUrls: options.denyUrls || [],
    allowUrls: options.allowUrls || [],
    serviceUrls: options.serviceUrls || [],
    redactKeys: options.redactKeys || DEFAULT_REDACT_KEYS,
    redactValue: options.redactValue === undefined ? DEFAULT_REDACT_VALUE : options.redactValue,
    maxStringLength: readOptionalPositiveInt(options.maxStringLength, DEFAULT_MAX_STRING_LENGTH),
    maxAttributeDepth: readOptionalPositiveInt(options.maxAttributeDepth, DEFAULT_MAX_ATTRIBUTE_DEPTH),
    maxPayloadBytes: readOptionalPositiveInt(options.maxPayloadBytes)
  };
}

function createStringDictionary() {
  const map = new Map<string, number>();
  const values: string[] = [];
  return {
    values,
    id(value: string): number {
      const existing = map.get(value);
      if (existing !== undefined) return existing;
      const id = values.length;
      map.set(value, id);
      values[id] = value;
      return id;
    }
  };
}

function readString(values: string[], index: number): string {
  const value = values[index];
  if (value === undefined) throw new Error('invalid browser telemetry string reference');
  return value;
}

function matchesAny(value: string, matchers: readonly BrowserTelemetryMatcher[]): boolean {
  for (let i = 0; i < matchers.length; i++) {
    const matcher = matchers[i];
    if (typeof matcher === 'string') {
      if (value === matcher || value.toLowerCase() === matcher.toLowerCase()) return true;
    } else if (matcher.test(value)) {
      return true;
    }
  }
  return false;
}

function jsonByteLength(value: JsonValue | BrowserTelemetryEvent): number {
  return textEncoder.encode(JSON.stringify(value)).byteLength;
}

function createBrowserTelemetrySessionId(): string {
  const time = Date.now().toString(36);
  const random = Math.floor(Math.random() * 0xffffffff).toString(36).padStart(7, '0');
  return 'bt-' + time + '-' + random;
}

function readOptionalPositiveInt(value: number | undefined, fallback?: number): number | undefined {
  if (value === undefined) return fallback;
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : fallback;
}

function isCompactBrowserTelemetryBatch(value: unknown): value is CompactBrowserTelemetryBatch {
  return !!value && typeof value === 'object' && (value as CompactBrowserTelemetryBatch).version === 1 &&
    Array.isArray((value as CompactBrowserTelemetryBatch).events);
}
