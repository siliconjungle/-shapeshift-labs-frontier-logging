import {
  compactLogBatch,
  createBrowserLogSink,
  createJsonLogSink,
  createLogBuffer,
  createLogger,
  createNdjsonLogSink,
  decodeLogBatch,
  encodeLogBatch,
  type CompactLogBatch,
  type FrontierLogger,
  type LogBuffer,
  type LogRecord,
  type PatchTelemetry
} from '../dist/index.js';
import {
  compactBrowserTelemetryBatch,
  createBrowserBreadcrumbLogSink,
  createBrowserOfflineTelemetryBuffer,
  createBrowserTelemetryBuffer,
  decodeBrowserTelemetryBatch,
  encodeBrowserTelemetryBatch,
  sanitizeBrowserTelemetryEvent,
  type BrowserTelemetryBuffer
} from '../dist/browser.js';
import {
  logCrdtUpdate,
  logPatch,
  logRegistryGraph,
  summarizeCrdtUpdate,
  summarizePatch,
  summarizeRegistryGraph,
  type CrdtUpdate,
  type CrdtUpdateInput,
  type RegistryGraphTelemetry
} from '../dist/frontier.js';
import { createFileLogSink } from '../dist/node.js';
import {
  exportOpenTelemetryLogs,
  exportPerfettoTraceEvents
} from '../dist/exporters.js';
import { attachBenchmarkLogTrace } from '../dist/benchmark.js';

const buffer: LogBuffer = createLogBuffer({ capacity: 8 });
const logger: FrontierLogger = createLogger({
  level: 'info',
  buffer,
  sinks: [
    createJsonLogSink((line: string) => void line),
    createNdjsonLogSink((line: string) => void line),
    createBrowserLogSink({ console }),
    createFileLogSink('/tmp/frontier-logging-types.ndjson')
  ]
});

const record: LogRecord | undefined = logger.info('types.event', {
  ok: true
});
const records: LogRecord[] = logger.snapshot();
const batch: CompactLogBatch = compactLogBatch(records);
const encoded = encodeLogBatch(records);
const decoded: LogRecord[] = decodeLogBatch(encoded);

const patchTelemetry: PatchTelemetry = summarizePatch([[0, ['count'], 1]], {
  includeByteLength: true
});
logPatch(logger, 'info', 'types.patch', [[0, ['count'], 1]]);

const crdtUpdate: CrdtUpdate = {
  actor: 'types-a',
  seq: 1,
  deps: [],
  ops: [
    {
      type: 'textRun',
      id: 'types-a:1',
      actor: 'types-a',
      seq: 1,
      path: ['body'],
      text: 'hello',
      count: 5
    }
  ],
  metadata: { source: 'types' }
};
const crdtInput: CrdtUpdateInput = crdtUpdate;
const crdtTelemetry = summarizeCrdtUpdate(crdtInput);
logCrdtUpdate(logger, 'info', 'types.crdt', crdtInput);

const registryGraph = {
  kind: 'frontier.registry.graph' as const,
  version: 1 as const,
  entries: [{
    id: 'types.action',
    kind: 'action',
    feature: 'types',
    package: '@app/types',
    source: { file: 'src/types.ts' },
    tags: ['types']
  }],
  records: [],
  edges: [{ from: 'entry:types.action', to: 'path:/types/value', kind: 'declares-read' }]
};
const registryTelemetry: RegistryGraphTelemetry = summarizeRegistryGraph(registryGraph);
logRegistryGraph(logger, 'info', 'types.registry', registryGraph);

const browserBuffer: BrowserTelemetryBuffer = createBrowserTelemetryBuffer({
  sessionId: 'types-browser',
  capacity: 8
});
browserBuffer.breadcrumb({ message: 'clicked user@example.com' });
const browserBatch = compactBrowserTelemetryBatch(browserBuffer.snapshot(), {
  sessionId: browserBuffer.sessionId
});
const browserEncoded = encodeBrowserTelemetryBatch(browserBuffer.snapshot());
decodeBrowserTelemetryBatch(browserEncoded);
sanitizeBrowserTelemetryEvent({
  kind: 'network',
  time: 1,
  url: 'https://app.example/?token=secret'
});

const storage = new Map<string, string>();
createBrowserOfflineTelemetryBuffer({
  storage: {
    getItem(key) {
      return storage.get(key) || null;
    },
    setItem(key, value) {
      storage.set(key, value);
    },
    removeItem(key) {
      storage.delete(key);
    }
  }
});
createBrowserBreadcrumbLogSink({ buffer: browserBuffer });

exportOpenTelemetryLogs(records);
exportPerfettoTraceEvents(records);
attachBenchmarkLogTrace({ name: 'types' }, records);

void record;
void decoded;
void batch;
void patchTelemetry;
void crdtTelemetry;
void registryTelemetry;
void browserBatch;
