import assert from 'node:assert';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { diff } from '@shapeshift-labs/frontier';
import {
  compactLogBatch,
  createBrowserLogSink,
  createJsonLogSink,
  createLogBuffer,
  createLogger,
  createNdjsonLogSink,
  decodeLogBatch,
  encodeLogBatch
} from '@shapeshift-labs/frontier-logging';
import {
  compactBrowserTelemetryBatch,
  createBrowserBreadcrumbLogSink,
  createBrowserOfflineTelemetryBuffer,
  createBrowserTelemetryBuffer,
  decodeBrowserTelemetryBatch,
  encodeBrowserTelemetryBatch,
  sanitizeBrowserTelemetryEvent
} from '@shapeshift-labs/frontier-logging/browser';
import {
  logCrdtUpdate,
  logPatch,
  summarizeCrdtUpdate,
  summarizePatch
} from '@shapeshift-labs/frontier-logging/frontier';
import { createFileLogSink } from '@shapeshift-labs/frontier-logging/node';
import {
  exportOpenTelemetryLogs,
  exportPerfettoTraceEvents
} from '@shapeshift-labs/frontier-logging/exporters';
import { attachBenchmarkLogTrace } from '@shapeshift-labs/frontier-logging/benchmark';

let lazyCalls = 0;
const disabled = createLogger({ level: 'warn', bufferCapacity: 4 });
assert.strictEqual(disabled.debug('skip', () => {
  lazyCalls++;
  return { expensive: true };
}), undefined);
assert.strictEqual(lazyCalls, 0);

const buffer = createLogBuffer({ capacity: 4 });
const lines = [];
let now = 1000;
const logger = createLogger({
  level: 'trace',
  context: { component: 'unit' },
  resource: { service: 'frontier-logging-test' },
  scope: 'logging-test',
  buffer,
  sinks: createJsonLogSink((line) => lines.push(line)),
  now: () => now
});

const child = logger.child({ requestId: 'r1' });
const info = child.info('unit.event', { ok: true }, 'hello');
assert.strictEqual(info.attributes.component, 'unit');
assert.strictEqual(info.attributes.requestId, 'r1');
assert.strictEqual(lines.length, 1);

const span = child.startSpan('unit.span', { phaseId: 1 });
now = 1015;
span.event('debug', 'unit.span.step', { step: 1 });
now = 1037;
const ended = span.end({ result: 'ok' });
assert.strictEqual(ended.durationMs, 37);

const source = { rows: [{ id: 'a', score: 1 }], meta: { tick: 0 } };
const target = { rows: [{ id: 'a', score: 2 }, { id: 'b', score: 3 }], meta: { tick: 1 } };
const patch = diff(source, target, { arrayKey: 'id', validate: true });
const patchTelemetry = summarizePatch(patch, { includeByteLength: true });
assert.strictEqual(patchTelemetry.kind, 'patch');
assert.strictEqual(patchTelemetry.opCount, patch.length);
assert.ok(patchTelemetry.byteLength > 0);
assert.ok(patchTelemetry.pathCount > 0);

const patchRecord = logPatch(logger, 'info', 'patch.commit', patch, { document: 'doc-1' }, { includeByteLength: true });
assert.strictEqual(patchRecord.patch.byteLength, patchTelemetry.byteLength);

const update = {
  actor: 'logging-a',
  seq: 1,
  deps: [],
  ops: [
    { type: 'set', id: 'logging-a:1', actor: 'logging-a', seq: 1, deps: [], path: ['title'], value: 'hello' },
    { type: 'textRun', id: 'logging-a:2', actor: 'logging-a', seq: 2, deps: ['logging-a:1'], path: ['body'], after: null, text: 'abc', count: 3 }
  ]
};
const crdtTelemetry = summarizeCrdtUpdate(update);
assert.strictEqual(crdtTelemetry.kind, 'crdt-update');
assert.strictEqual(crdtTelemetry.actor, 'logging-a');
assert.strictEqual(crdtTelemetry.logicalOpCount, 4);
assert.strictEqual(crdtTelemetry.stateVector['logging-a'], 4);
assert.ok(crdtTelemetry.byteLength > 0);

const crdtRecord = logCrdtUpdate(logger, 'info', 'crdt.update', update, { peer: 'remote' });
assert.strictEqual(crdtRecord.crdt.actor, 'logging-a');

const records = logger.snapshot();
assert.deepStrictEqual(decodeLogBatch(encodeLogBatch(records)), records);
assert.strictEqual(compactLogBatch(records, 1234).version, 1);

const ndjsonLines = [];
const ndjsonLogger = createLogger({ level: 'info', buffer: false, sinks: createNdjsonLogSink((line) => ndjsonLines.push(line)), now: () => 1 });
ndjsonLogger.info('ndjson.event', { ok: true });
assert.ok(ndjsonLines[0].endsWith('\n'));

const browserCalls = [];
const browserLogger = createLogger({
  level: 'info',
  buffer: false,
  sinks: createBrowserLogSink({ console: { info: (...args) => browserCalls.push(args) } }),
  now: () => 2
});
browserLogger.info('browser.event', { ok: true }, 'browser message');
assert.strictEqual(browserCalls.length, 1);

const telemetryBuffer = createBrowserTelemetryBuffer({
  sessionId: 'browser-unit',
  capacity: 4,
  maxBytes: 2048,
  now: () => 10,
  serviceUrls: [/telemetry\.example/]
});
const breadcrumb = telemetryBuffer.breadcrumb({
  category: 'ui',
  level: 'info',
  message: 'clicked user@example.com order 123456789',
  attributes: { token: 'secret-token' }
});
assert.strictEqual(breadcrumb.message, 'clicked [email] order 0000');
assert.strictEqual(breadcrumb.attributes.token, '[redacted]');
assert.strictEqual(telemetryBuffer.network({ url: 'https://telemetry.example/ingest?token=secret' }), undefined);

const sanitized = sanitizeBrowserTelemetryEvent({
  kind: 'network',
  time: 11,
  url: 'https://app.example/api/login?token=secret',
  request: { headers: { Authorization: 'Bearer secret' }, body: { token: 'secret', keep: true } }
}, { capturePayload: true });
assert.strictEqual(sanitized.url, 'https://app.example/api/login');
assert.strictEqual(sanitized.data.request.body.token, '[redacted]');

const encodedBrowser = encodeBrowserTelemetryBatch(telemetryBuffer.snapshot(), { sessionId: telemetryBuffer.sessionId, now: 99 });
assert.deepStrictEqual(decodeBrowserTelemetryBatch(encodedBrowser), telemetryBuffer.snapshot());
assert.strictEqual(compactBrowserTelemetryBatch(telemetryBuffer.snapshot(), { sessionId: telemetryBuffer.sessionId }).version, 1);

const storage = createMemoryStorage();
const offline = createBrowserOfflineTelemetryBuffer({ sessionId: 'offline-unit', storage, key: 'frontier.test.telemetry', now: () => 20 });
offline.breadcrumb({ message: 'offline one' });
const restored = createBrowserOfflineTelemetryBuffer({ sessionId: 'offline-unit', storage, key: 'frontier.test.telemetry', now: () => 21 });
assert.strictEqual(restored.snapshot()[0].message, 'offline one');

const breadcrumbSink = createBrowserBreadcrumbLogSink({ sessionId: 'sink-unit', now: () => 30, includeTelemetry: true });
const sinkLogger = createLogger({ level: 'info', buffer: false, sinks: breadcrumbSink, now: () => 30 });
sinkLogger.info('sink.event', { token: 'secret-token' }, 'sink message');
assert.strictEqual(breadcrumbSink.telemetrySnapshot()[0].attributes.attributes.token, '[redacted]');

const tempDir = mkdtempSync(join(tmpdir(), 'frontier-logging-'));
try {
  const filePath = join(tempDir, 'nested', 'trace.ndjson');
  const fileLogger = createLogger({ level: 'info', buffer: false, sinks: createFileLogSink(filePath, { append: false }), now: () => 3 });
  fileLogger.info('file.event', { ok: true });
  assert.strictEqual(JSON.parse(readFileSync(filePath, 'utf8').trim()).name, 'file.event');
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}

const otel = exportOpenTelemetryLogs(records, { resource: { env: 'test' }, scopeName: 'frontier.test' });
assert.strictEqual(otel.resourceLogs[0].scopeLogs[0].logRecords.length, records.length);
const perfetto = exportPerfettoTraceEvents(records, { pid: 7, tid: 9 });
assert.strictEqual(perfetto.traceEvents[0].pid, 7);
assert.strictEqual(attachBenchmarkLogTrace({ name: 'unit' }, logger, { maxRecords: 2 }).logTrace.format, 'frontier-log-batch-v1');

console.log('frontier-logging smoke passed');

function createMemoryStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    }
  };
}
