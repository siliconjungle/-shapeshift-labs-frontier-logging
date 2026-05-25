import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { diff } from '@shapeshift-labs/frontier';
import {
  createLogBuffer,
  createLogger,
  encodeLogBatch
} from '../dist/index.js';
import {
  createBrowserBreadcrumbLogSink,
  createBrowserOfflineTelemetryBuffer,
  createBrowserTelemetryBuffer,
  encodeBrowserTelemetryBatch
} from '../dist/browser.js';
import { attachBenchmarkLogTrace } from '../dist/benchmark.js';
import {
  logCrdtUpdate,
  logPatch,
  summarizeCrdtUpdate,
  summarizePatch
} from '../dist/frontier.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const args = parseArgs(process.argv.slice(2));
const rounds = readPositiveInt(args.rounds, 9);
const outPath = args.out ? path.resolve(rootDir, args.out) : null;
let sink = 0;

const source = { rows: [{ id: 'a', score: 1 }], meta: { tick: 0 }, text: 'hello' };
const target = { rows: [{ id: 'a', score: 3 }, { id: 'b', score: 4 }], meta: { tick: 1 }, text: 'hello world' };
const patch = diff(source, target, { arrayKey: 'id', validate: true });
const update = makeCrdtUpdate();
const batchRecords = makeBatchRecords();
const browserTelemetryEvents = makeBrowserTelemetryEvents();

const rows = [
  runRow('Disabled lazy event', 12000, measureDisabledLazy),
  runRow('Sampled-out event', 12000, measureSampledOut),
  runRow('Buffered info event', 8000, measureBufferEvent),
  runRow('Child context event', 8000, measureChildContext),
  runRow('Redacted capped event', 2500, measureRedactedEvent),
  runRow('Patch summary', 3000, () => summarizePatch(patch).opCount),
  runRow('CRDT update object summary', 3000, () => summarizeCrdtUpdate(update).logicalOpCount),
  runRow('Compact log batch encode, 64 records', 500, () => encodeLogBatch(batchRecords).byteLength),
  runRow('Browser network telemetry', 2500, measureBrowserNetworkDefault),
  runRow('Browser breadcrumb sink', 2500, measureBrowserBreadcrumbSink),
  runRow('Browser offline buffer write', 600, measureBrowserOfflineBuffer),
  runRow('Browser telemetry batch encode, 128 events', 400, () => encodeBrowserTelemetryBatch(browserTelemetryEvents).byteLength)
];

finish('@shapeshift-labs/frontier-logging', rows);

function measureDisabledLazy() {
  let lazyCalls = 0;
  const logger = createLogger({ level: 'warn', buffer: false, now: () => 1 });
  logger.debug('skip', () => {
    lazyCalls++;
    return { expensive: true };
  });
  return lazyCalls;
}

function measureSampledOut() {
  let lazyCalls = 0;
  const logger = createLogger({ level: 'trace', buffer: false, sampleRate: 0, random: () => 0, now: () => 1 });
  logger.info('bench.sampled', () => {
    lazyCalls++;
    return { expensive: true };
  });
  return lazyCalls;
}

function measureBufferEvent() {
  const logger = createLogger({ level: 'info', bufferCapacity: 4096, now: () => 1 });
  return logger.info('bench.event', { row: sink++, ok: true })?.severityNumber || 0;
}

function measureChildContext() {
  const logger = createLogger({ level: 'info', context: { component: 'bench' }, bufferCapacity: 4096, now: () => 1 })
    .child({ requestId: 'r1' });
  return logger.info('bench.child', { step: sink++ & 15 })?.attributes?.step || 0;
}

function measureRedactedEvent() {
  const logger = createLogger({
    level: 'info',
    bufferCapacity: 4096,
    redactKeys: ['token'],
    maxStringLength: 24,
    maxPayloadBytes: 512,
    now: () => 1
  });
  return logger.info('bench.redacted', { row: sink++, token: 'secret-' + sink, payload: 'x'.repeat(96) })?.severityNumber || 0;
}

function measureBrowserNetworkDefault() {
  const buffer = createBrowserTelemetryBuffer({
    sessionId: 'logging-browser-bench',
    capacity: 4096,
    maxBytes: 256 * 1024,
    now: () => 1
  });
  return buffer.network({
    url: 'https://app.example/api/items/' + (sink++ & 31) + '?token=secret',
    method: 'post',
    status: 200,
    durationMs: sink & 15,
    request: {
      headers: {
        Authorization: 'Bearer secret',
        'X-Trace': 'trace-' + (sink & 7)
      },
      body: { token: 'secret', row: sink }
    }
  })?.status || 0;
}

function measureBrowserBreadcrumbSink() {
  const sinkBuffer = createBrowserBreadcrumbLogSink({
    sessionId: 'logging-browser-sink-bench',
    capacity: 4096,
    maxBytes: 256 * 1024,
    now: () => 1
  });
  const logger = createLogger({ level: 'info', buffer: false, sinks: sinkBuffer, now: () => 1 });
  return logger.info('bench.browser.breadcrumb', { row: sink++, token: 'secret-' + sink }, 'breadcrumb')?.severityNumber || 0;
}

function measureBrowserOfflineBuffer() {
  let stored = '';
  const storage = {
    getItem() {
      return stored || null;
    },
    setItem(_key, value) {
      stored = value;
    },
    removeItem() {
      stored = '';
    }
  };
  const buffer = createBrowserOfflineTelemetryBuffer({
    sessionId: 'logging-browser-offline-bench',
    capacity: 32,
    maxBytes: 16 * 1024,
    storage,
    now: () => 1
  });
  return buffer.breadcrumb({
    category: 'offline',
    message: 'offline ' + (sink++ & 15),
    attributes: { token: 'secret-' + sink, row: sink }
  })?.time || 0;
}

function makeBatchRecords() {
  const buffer = createLogBuffer({ capacity: 128 });
  const logger = createLogger({ level: 'info', context: { component: 'batch' }, buffer, now: () => 1 });
  for (let i = 0; i < 62; i++) logger.info('batch.event', { row: i, path: '/rows/' + (i & 7) + '/score' });
  logPatch(logger, 'info', 'batch.patch', patch);
  logCrdtUpdate(logger, 'info', 'batch.crdt', update);
  return buffer.snapshot();
}

function makeBrowserTelemetryEvents() {
  const buffer = createBrowserTelemetryBuffer({
    sessionId: 'logging-browser-batch',
    capacity: 128,
    now: () => 1,
    capturePayload: true,
    maxBytes: 256 * 1024
  });
  for (let i = 0; i < 96; i++) {
    buffer.breadcrumb({
      category: 'ui',
      level: 'info',
      message: 'clicked row ' + (i & 15),
      attributes: { row: i, token: 'secret-' + i }
    });
  }
  for (let i = 0; i < 32; i++) {
    buffer.network({
      url: 'https://app.example/api/items/' + (i & 7) + '?token=secret',
      method: i % 2 === 0 ? 'get' : 'post',
      status: 200 + (i & 3),
      durationMs: i,
      request: {
        headers: {
          Authorization: 'Bearer secret',
          'X-Trace': 'trace-' + (i & 3)
        },
        body: { token: 'secret-' + i, row: i }
      }
    });
  }
  return buffer.snapshot();
}

function makeCrdtUpdate() {
  return {
    actor: 'logging-bench',
    seq: 1,
    deps: [],
    ops: [
      { type: 'set', id: 'logging-bench:1', actor: 'logging-bench', seq: 1, deps: [], path: ['meta', 'tick'], value: 1 },
      { type: 'textRun', id: 'logging-bench:2', actor: 'logging-bench', seq: 2, deps: ['logging-bench:1'], path: ['body'], text: 'hello world', count: 11 }
    ],
    metadata: { benchmark: true }
  };
}

function runRow(name, inner, fn) {
  for (let i = 0; i < inner; i++) sink += Number(fn()) || 0;
  const samples = new Array(rounds);
  for (let roundIndex = 0; roundIndex < rounds; roundIndex++) {
    const start = performance.now();
    for (let i = 0; i < inner; i++) sink += Number(fn()) || 0;
    samples[roundIndex] = ((performance.now() - start) * 1000) / inner;
  }
  samples.sort((left, right) => left - right);
  return {
    fixture: name,
    medianUs: round(percentile(samples, 0.5)),
    p95Us: round(percentile(samples, 0.95))
  };
}

function finish(packageName, rows) {
  const report = {
    package: packageName,
    version: readPackageVersion(),
    generatedAt: new Date().toISOString(),
    node: process.version,
    platform: process.platform + ' ' + process.arch,
    rounds,
    rows
  };
  attachBenchmarkLogTrace(report, batchRecords, { maxRecords: 32, now: Date.now() });
  if (outPath) {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n');
  }
  console.log(packageName + ' package benchmark');
  console.log('Node ' + report.node + ' on ' + report.platform + ', rounds=' + rounds);
  console.log('These are Frontier-only package measurements, not competitor comparisons.');
  console.log('');
  console.log(padRight('Fixture', 44) + padLeft('Median', 12) + padLeft('p95', 11));
  for (const row of rows) {
    console.log(padRight(row.fixture, 44) + padLeft(formatUs(row.medianUs), 12) + padLeft(formatUs(row.p95Us), 11));
  }
  if (outPath) console.log('\nwrote ' + path.relative(rootDir, outPath));
  if (sink === 42) console.log('sink=' + sink);
}

function percentile(sorted, fraction) {
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * fraction) - 1))];
}

function readPackageVersion() {
  return JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8')).version;
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--rounds') out.rounds = argv[++i];
    else if (arg === '--out') out.out = argv[++i];
    else if (arg === '--help' || arg === '-h') {
      console.log('Usage: npm run bench -- [--rounds 9] [--out benchmarks/results/package-bench.json]');
      process.exit(0);
    } else {
      throw new Error('unknown argument: ' + arg);
    }
  }
  return out;
}

function readPositiveInt(value, fallback) {
  if (value === undefined) return fallback;
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) throw new Error('expected positive integer, got ' + value);
  return number;
}

function round(value) {
  return Math.round(value * 100) / 100;
}

function formatUs(value) {
  return value >= 1000 ? (value / 1000).toFixed(2) + ' ms' : value.toFixed(2) + ' us';
}

function padRight(value, width) {
  return String(value).padEnd(width);
}

function padLeft(value, width) {
  return String(value).padStart(width);
}
