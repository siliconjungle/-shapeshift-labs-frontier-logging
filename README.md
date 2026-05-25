# Frontier Logging

Opt-in structured logging, telemetry buffers, exporters, and Frontier patch summaries.

This package sits beside the core [`@shapeshift-labs/frontier`](https://www.npmjs.com/package/@shapeshift-labs/frontier) diff/apply package. It keeps logging out of core imports while exposing lightweight structured records, browser telemetry buffers, file sinks, trace/export helpers, and Frontier patch/update summaries behind explicit subpaths.

- npm: [`@shapeshift-labs/frontier-logging`](https://www.npmjs.com/package/@shapeshift-labs/frontier-logging)
- source: [`siliconjungle/-shapeshift-labs-frontier-logging`](https://github.com/siliconjungle/-shapeshift-labs-frontier-logging)
- license: MIT

## Related Packages

- [`@shapeshift-labs/frontier`](https://www.npmjs.com/package/@shapeshift-labs/frontier): core JSON diff/apply primitives.
- [`@shapeshift-labs/frontier-query`](https://www.npmjs.com/package/@shapeshift-labs/frontier-query): shared query-key, selector path, condition, identity, and table-schema primitives.
- [`@shapeshift-labs/frontier-codec`](https://www.npmjs.com/package/@shapeshift-labs/frontier-codec): patch serialization, binary frames, canonical JSON, and patch-history codecs.
- [`@shapeshift-labs/frontier-engine`](https://www.npmjs.com/package/@shapeshift-labs/frontier-engine): planned diff engine and adaptive profiles.
- [`@shapeshift-labs/frontier-state`](https://www.npmjs.com/package/@shapeshift-labs/frontier-state): patch-routed app-state subscriptions and maintained views.
- [`@shapeshift-labs/frontier-state-cache`](https://www.npmjs.com/package/@shapeshift-labs/frontier-state-cache): normalized query-result cache.
- [`@shapeshift-labs/frontier-schema`](https://www.npmjs.com/package/@shapeshift-labs/frontier-schema): JSON Schema validation and profile generation.
- [`@shapeshift-labs/frontier-mutation`](https://www.npmjs.com/package/@shapeshift-labs/frontier-mutation): explicit mutation and selector plans.

Package source repositories:

- [`siliconjungle/-shapeshift-labs-frontier`](https://github.com/siliconjungle/-shapeshift-labs-frontier)
- [`siliconjungle/-shapeshift-labs-frontier-query`](https://github.com/siliconjungle/-shapeshift-labs-frontier-query)
- [`siliconjungle/-shapeshift-labs-frontier-codec`](https://github.com/siliconjungle/-shapeshift-labs-frontier-codec)
- [`siliconjungle/-shapeshift-labs-frontier-engine`](https://github.com/siliconjungle/-shapeshift-labs-frontier-engine)
- [`siliconjungle/-shapeshift-labs-frontier-state`](https://github.com/siliconjungle/-shapeshift-labs-frontier-state)
- [`siliconjungle/-shapeshift-labs-frontier-state-cache`](https://github.com/siliconjungle/-shapeshift-labs-frontier-state-cache)
- [`siliconjungle/-shapeshift-labs-frontier-schema`](https://github.com/siliconjungle/-shapeshift-labs-frontier-schema)
- [`siliconjungle/-shapeshift-labs-frontier-mutation`](https://github.com/siliconjungle/-shapeshift-labs-frontier-mutation)
- [`siliconjungle/-shapeshift-labs-frontier-logging`](https://github.com/siliconjungle/-shapeshift-labs-frontier-logging)

## Install

```sh
npm install @shapeshift-labs/frontier @shapeshift-labs/frontier-codec @shapeshift-labs/frontier-logging
```

## Usage

```ts
import { diff } from '@shapeshift-labs/frontier';
import { createLogger, encodeLogBatch } from '@shapeshift-labs/frontier-logging';
import { logPatch } from '@shapeshift-labs/frontier-logging/frontier';

const logger = createLogger({
  level: 'info',
  context: { component: 'todos' },
  bufferCapacity: 256,
  redactKeys: ['token', 'password'],
  maxStringLength: 256
});

const before = { todos: [{ id: 'a', done: false }] };
const after = { todos: [{ id: 'a', done: true }] };
const patch = diff(before, after, { arrayKey: 'id' });

logPatch(logger, 'info', 'todos.patch', patch, { documentId: 'todos' });

const bytes = encodeLogBatch(logger.snapshot());
console.log(bytes.byteLength);
```

## API

```ts
import {
  compactLogBatch,
  createBrowserLogSink,
  createJsonLogSink,
  createLogBuffer,
  createLogger,
  createNdjsonLogSink,
  decodeLogBatch,
  encodeLogBatch,
  type FrontierLogger,
  type LogRecord
} from '@shapeshift-labs/frontier-logging';
```

### Core Logging

- `createLogger(options?)` creates a structured logger with sampling, redaction, bounded payloads, child contexts, and spans.
- `createLogBuffer({ capacity? })` creates a ring buffer sink.
- `createJsonLogSink(writer)` and `createNdjsonLogSink(writer)` write JSON records.
- `createBrowserLogSink(options?)` writes records to a console-like browser sink.
- `compactLogBatch(records, now?)`, `encodeLogBatch(records)`, and `decodeLogBatch(bytes)` provide compact transport for records.

The root import is intentionally generic. It does not load Frontier patch adapters, CRDT adapters, Node file sinks, or exporter code.

### Browser Telemetry

```ts
import {
  createBrowserBreadcrumbLogSink,
  createBrowserOfflineTelemetryBuffer,
  createBrowserTelemetryBuffer,
  sanitizeBrowserTelemetryEvent
} from '@shapeshift-labs/frontier-logging/browser';
```

Browser telemetry buffers capture breadcrumbs, network events, replay metadata, and offline storage snapshots with privacy defaults for URLs, headers, long numbers, email addresses, sensitive keys, and payload size caps.

### Frontier Adapters

```ts
import {
  logCrdtUpdate,
  logPatch,
  summarizeCrdtUpdate,
  summarizePatch
} from '@shapeshift-labs/frontier-logging/frontier';
```

`summarizePatch()` and `logPatch()` summarize compact Frontier patches. `summarizeCrdtUpdate()` and `logCrdtUpdate()` currently accept structural CRDT update objects. Binary CRDT update inputs are summarized by encoded byte length only until `@shapeshift-labs/frontier-crdt` becomes a real extracted dependency.

### Node File Sink

```ts
import { createFileLogSink } from '@shapeshift-labs/frontier-logging/node';
```

`createFileLogSink(path, options?)` writes newline-delimited JSON records and can create parent directories on first write.

### Exporters

```ts
import {
  exportOpenTelemetryLogs,
  exportPerfettoTraceEvents
} from '@shapeshift-labs/frontier-logging/exporters';
```

Exporters convert bounded Frontier log records to OpenTelemetry-style JSON or Perfetto trace-event JSON.

### Benchmark Traces

```ts
import { attachBenchmarkLogTrace } from '@shapeshift-labs/frontier-logging/benchmark';
```

`attachBenchmarkLogTrace(payload, source, options?)` attaches a compact log trace to benchmark result payloads without storing full documents.

## Subpath Imports

```ts
import { createLogger } from '@shapeshift-labs/frontier-logging';
import { createBrowserTelemetryBuffer } from '@shapeshift-labs/frontier-logging/browser';
import { summarizePatch } from '@shapeshift-labs/frontier-logging/frontier';
import { createFileLogSink } from '@shapeshift-labs/frontier-logging/node';
import { exportPerfettoTraceEvents } from '@shapeshift-labs/frontier-logging/exporters';
import { attachBenchmarkLogTrace } from '@shapeshift-labs/frontier-logging/benchmark';
```

## Package Scope

This package owns:

- generic structured logging,
- bounded log buffers and compact log batches,
- browser telemetry buffers and privacy sanitizers,
- Node file sinks,
- OpenTelemetry and Perfetto JSON exporters,
- Frontier patch/update telemetry summaries,
- benchmark trace attachment.

It does not own:

- diff/apply primitives,
- patch/history byte formats,
- app-state subscriptions,
- query/result caches,
- mutation planning,
- CRDT documents, heads, branches, sync, awareness, or rich text.

## TypeScript

The package ships ESM JavaScript plus `.d.ts` declarations for the root export and public subpaths. The package-local TypeScript source lives in `src/` and compiles directly to `dist/`.

## Validation

```sh
npm test
npm run fuzz
npm run bench
npm run pack:dry
```

The package test suite covers root and subpath imports, disabled lazy logging, child contexts, spans, patch summaries, structural CRDT update summaries, log batch encoding, browser telemetry sanitization, offline buffers, file sinks, exporters, and benchmark trace attachment. The fuzzer varies patches, structural CRDT updates, redaction, browser telemetry, and compact batch round-trips.

## Benchmarks

Run the package-local benchmark:

```sh
npm run bench
```

Latest local package benchmark on Node v26.1.0, darwin arm64, 9 rounds:

| Fixture | Median | p95 |
| --- | ---: | ---: |
| Disabled lazy event | 2.86 us | 3.33 us |
| Sampled-out event | 3.41 us | 4.68 us |
| Buffered info event | 10.62 us | 17.85 us |
| Child context event | 9.09 us | 9.86 us |
| Redacted capped event | 12.43 us | 13.13 us |
| Patch summary | 0.78 us | 0.94 us |
| CRDT update object summary | 2.40 us | 2.69 us |
| Compact log batch encode, 64 records | 46.98 us | 57.07 us |
| Browser network telemetry | 8.03 us | 8.70 us |
| Browser breadcrumb sink | 11.25 us | 13.00 us |
| Browser offline buffer write | 3.29 us | 4.00 us |
| Browser telemetry batch encode, 128 events | 44.31 us | 47.14 us |

These are Frontier-only package measurements, not competitor comparisons.

## License

MIT. See [LICENSE](./LICENSE).
