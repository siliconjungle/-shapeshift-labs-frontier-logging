# Frontier Logging

Opt-in structured logging, telemetry buffers, exporters, and Frontier patch summaries.

This package sits beside the core [`@shapeshift-labs/frontier`](https://www.npmjs.com/package/@shapeshift-labs/frontier) diff/apply package. It keeps logging out of core imports while exposing lightweight structured records, browser telemetry buffers, file sinks, trace/export helpers, and Frontier patch/update summaries behind explicit subpaths.

- npm: [`@shapeshift-labs/frontier-logging`](https://www.npmjs.com/package/@shapeshift-labs/frontier-logging)
- source: [`siliconjungle/-shapeshift-labs-frontier-logging`](https://github.com/siliconjungle/-shapeshift-labs-frontier-logging)
- license: MIT

## Related Packages

The published Frontier package family is generated from one shared package catalog so READMEs stay in sync across packages:

- [`@shapeshift-labs/frontier`](https://www.npmjs.com/package/@shapeshift-labs/frontier): Core JSON diff/apply, compact patch tuples, JSON Pointer, equality, clone, validation, Unicode helpers, and tiny dependency-free runtime budget/scheduler primitives.
- [`@shapeshift-labs/frontier-query`](https://www.npmjs.com/package/@shapeshift-labs/frontier-query): Shared query-key, selector path, condition, entity identity, and table-shape primitives.
- [`@shapeshift-labs/frontier-codec`](https://www.npmjs.com/package/@shapeshift-labs/frontier-codec): Patch serialization, binary frames, canonical JSON, and patch-history codecs.
- [`@shapeshift-labs/frontier-engine`](https://www.npmjs.com/package/@shapeshift-labs/frontier-engine): Stateful planned diff engine, adaptive profiles, schema plans, and engine-level history helpers.
- [`@shapeshift-labs/frontier-state`](https://www.npmjs.com/package/@shapeshift-labs/frontier-state): Patch-routed app-state subscriptions, owned commits, maintained views, and path mapping.
- [`@shapeshift-labs/frontier-state-cache`](https://www.npmjs.com/package/@shapeshift-labs/frontier-state-cache): Normalized query-result cache with entity/query watchers, persistence, change logs, optimistic layers, scheduled persistence, and mutation bridge.
- [`@shapeshift-labs/frontier-state-cache-idb`](https://www.npmjs.com/package/@shapeshift-labs/frontier-state-cache-idb): IndexedDB persistence adapter for Frontier state-cache snapshots and durable change logs.
- [`@shapeshift-labs/frontier-state-cache-file`](https://www.npmjs.com/package/@shapeshift-labs/frontier-state-cache-file): Structured file persistence adapter for Frontier state-cache snapshots and change logs.
- [`@shapeshift-labs/frontier-state-cache-sql`](https://www.npmjs.com/package/@shapeshift-labs/frontier-state-cache-sql): SQL persistence adapter for Frontier state-cache snapshots and change logs.
- [`@shapeshift-labs/frontier-schema`](https://www.npmjs.com/package/@shapeshift-labs/frontier-schema): JSON Schema validation, Frontier profile generation, CloudEvent envelopes, and query/table schema helpers.
- [`@shapeshift-labs/frontier-migrations`](https://www.npmjs.com/package/@shapeshift-labs/frontier-migrations): Boundary-first data migrations, import normalization, plugin/API version mapping, versioned envelopes, dry-run reports, and current-shape rehydration.
- [`@shapeshift-labs/frontier-event-log`](https://www.npmjs.com/package/@shapeshift-labs/frontier-event-log): Bounded event logs, replay cursors, consumer acknowledgements, keyed compaction, checkpoints, and Frontier patch event records.
- [`@shapeshift-labs/frontier-inspect`](https://www.npmjs.com/package/@shapeshift-labs/frontier-inspect): Cross-package inspection/evidence bundles, registry graph snapshots, feature/resource impact reports, timeline/event normalization, redaction, JSONL import/export, and AI-readable app feature maps.
- [`@shapeshift-labs/frontier-scheduler`](https://www.npmjs.com/package/@shapeshift-labs/frontier-scheduler): Deterministic work scheduling, lanes, cancellation, backpressure, frame policies, replay snapshots, and work graphs.
- [`@shapeshift-labs/frontier-mutation`](https://www.npmjs.com/package/@shapeshift-labs/frontier-mutation): Explicit mutation and selector plans compiled to Frontier patches or CRDT operations.
- [`@shapeshift-labs/frontier-virtual`](https://www.npmjs.com/package/@shapeshift-labs/frontier-virtual): DOM-neutral virtualization, layout providers, range materialization, grids, spatial/frustum indexes, patch invalidation, camera anchors, and serializable layout state.
- [`@shapeshift-labs/frontier-scene`](https://www.npmjs.com/package/@shapeshift-labs/frontier-scene): Patch-native 2D/3D scene graph, transform propagation, bounds queries, virtual/culling adapters, spatial invalidation, and camera/frustum materialization.
- [`@shapeshift-labs/frontier-pathfinding`](https://www.npmjs.com/package/@shapeshift-labs/frontier-pathfinding): Patch-native grid pathfinding, typed-array A*/Dijkstra search, flow fields, connected components, line-of-sight smoothing, dirty-cell invalidation, and scheduler-friendly path jobs.
- [`@shapeshift-labs/frontier-lod`](https://www.npmjs.com/package/@shapeshift-labs/frontier-lod): Patch-native level-of-detail and significance selection for rendering and computation workloads, compact typed hot paths, multi-observer selection, budget degradation, materialization frames, and scheduler work plans.
- [`@shapeshift-labs/frontier-route`](https://www.npmjs.com/package/@shapeshift-labs/frontier-route): DOM-neutral app/game route resources, route and scene manifests, match/resolve/transition planning, dependency metadata, sessions, registry graph output, and impact queries.
- [`@shapeshift-labs/frontier-dom`](https://www.npmjs.com/package/@shapeshift-labs/frontier-dom): Patch-native DOM and host renderer bindings, manifest hydration, JSX runtime/compiler helpers, SSR, devtools, and logging bridges.
- [`@shapeshift-labs/frontier-playwright`](https://www.npmjs.com/package/@shapeshift-labs/frontier-playwright): Playwright/headless automation probes for Frontier state, DOM, devtools, marks, and timeline queries.
- [`@shapeshift-labs/frontier-crdt`](https://www.npmjs.com/package/@shapeshift-labs/frontier-crdt): Native CRDT documents, update tooling, awareness, branches, conflict introspection, version frames, and undo.
- [`@shapeshift-labs/frontier-crdt-sync`](https://www.npmjs.com/package/@shapeshift-labs/frontier-crdt-sync): CRDT sync endpoints, repo/storage/provider contracts, scheduled sync work, document URLs, local networks, model checking, forensics, and text binding contracts.
- [`@shapeshift-labs/frontier-crdt-websocket`](https://www.npmjs.com/package/@shapeshift-labs/frontier-crdt-websocket): WebSocket client/server transports for Frontier CRDT sync providers.
- [`@shapeshift-labs/frontier-react`](https://www.npmjs.com/package/@shapeshift-labs/frontier-react): React external-store hooks and adapters for Frontier state, cache, and CRDT surfaces.
- [`@shapeshift-labs/frontier-richtext`](https://www.npmjs.com/package/@shapeshift-labs/frontier-richtext): Rich text Delta normalization/application, marks, embeds, ranges, and cursor/selection transforms for local editor integrations.
- [`@shapeshift-labs/frontier-realtime`](https://www.npmjs.com/package/@shapeshift-labs/frontier-realtime): Shared realtime command, tick, snapshot, prediction, reconciliation, interpolation, rollback, message, and delta primitives.
- [`@shapeshift-labs/frontier-realtime-server`](https://www.npmjs.com/package/@shapeshift-labs/frontier-realtime-server): Authoritative realtime room, tick, command validation, rate-limit, session, and snapshot-history runtime.
- [`@shapeshift-labs/frontier-realtime-websocket`](https://www.npmjs.com/package/@shapeshift-labs/frontier-realtime-websocket): WebSocket client, wire, and Node room-server transport for Frontier realtime.
- [`@shapeshift-labs/frontier-game`](https://www.npmjs.com/package/@shapeshift-labs/frontier-game): Game-facing entity, component, player, room, ownership, spatial interest, rollback, physics, and replication helpers above realtime.

Package source repositories:

- [`siliconjungle/-shapeshift-labs-frontier`](https://github.com/siliconjungle/-shapeshift-labs-frontier)
- [`siliconjungle/-shapeshift-labs-frontier-query`](https://github.com/siliconjungle/-shapeshift-labs-frontier-query)
- [`siliconjungle/-shapeshift-labs-frontier-codec`](https://github.com/siliconjungle/-shapeshift-labs-frontier-codec)
- [`siliconjungle/-shapeshift-labs-frontier-engine`](https://github.com/siliconjungle/-shapeshift-labs-frontier-engine)
- [`siliconjungle/-shapeshift-labs-frontier-state`](https://github.com/siliconjungle/-shapeshift-labs-frontier-state)
- [`siliconjungle/-shapeshift-labs-frontier-state-cache`](https://github.com/siliconjungle/-shapeshift-labs-frontier-state-cache)
- [`siliconjungle/-shapeshift-labs-frontier-state-cache-idb`](https://github.com/siliconjungle/-shapeshift-labs-frontier-state-cache-idb)
- [`siliconjungle/-shapeshift-labs-frontier-state-cache-file`](https://github.com/siliconjungle/-shapeshift-labs-frontier-state-cache-file)
- [`siliconjungle/-shapeshift-labs-frontier-state-cache-sql`](https://github.com/siliconjungle/-shapeshift-labs-frontier-state-cache-sql)
- [`siliconjungle/-shapeshift-labs-frontier-schema`](https://github.com/siliconjungle/-shapeshift-labs-frontier-schema)
- [`siliconjungle/-shapeshift-labs-frontier-migrations`](https://github.com/siliconjungle/-shapeshift-labs-frontier-migrations)
- [`siliconjungle/-shapeshift-labs-frontier-event-log`](https://github.com/siliconjungle/-shapeshift-labs-frontier-event-log)
- [`siliconjungle/-shapeshift-labs-frontier-inspect`](https://github.com/siliconjungle/-shapeshift-labs-frontier-inspect)
- [`siliconjungle/-shapeshift-labs-frontier-scheduler`](https://github.com/siliconjungle/-shapeshift-labs-frontier-scheduler)
- [`siliconjungle/-shapeshift-labs-frontier-logging`](https://github.com/siliconjungle/-shapeshift-labs-frontier-logging)
- [`siliconjungle/-shapeshift-labs-frontier-mutation`](https://github.com/siliconjungle/-shapeshift-labs-frontier-mutation)
- [`siliconjungle/-shapeshift-labs-frontier-virtual`](https://github.com/siliconjungle/-shapeshift-labs-frontier-virtual)
- [`siliconjungle/-shapeshift-labs-frontier-scene`](https://github.com/siliconjungle/-shapeshift-labs-frontier-scene)
- [`siliconjungle/-shapeshift-labs-frontier-pathfinding`](https://github.com/siliconjungle/-shapeshift-labs-frontier-pathfinding)
- [`siliconjungle/-shapeshift-labs-frontier-lod`](https://github.com/siliconjungle/-shapeshift-labs-frontier-lod)
- [`siliconjungle/-shapeshift-labs-frontier-route`](https://github.com/siliconjungle/-shapeshift-labs-frontier-route)
- [`siliconjungle/-shapeshift-labs-frontier-dom`](https://github.com/siliconjungle/-shapeshift-labs-frontier-dom)
- [`siliconjungle/-shapeshift-labs-frontier-playwright`](https://github.com/siliconjungle/-shapeshift-labs-frontier-playwright)
- [`siliconjungle/-shapeshift-labs-frontier-crdt`](https://github.com/siliconjungle/-shapeshift-labs-frontier-crdt)
- [`siliconjungle/-shapeshift-labs-frontier-crdt-sync`](https://github.com/siliconjungle/-shapeshift-labs-frontier-crdt-sync)
- [`siliconjungle/-shapeshift-labs-frontier-crdt-websocket`](https://github.com/siliconjungle/-shapeshift-labs-frontier-crdt-websocket)
- [`siliconjungle/-shapeshift-labs-frontier-react`](https://github.com/siliconjungle/-shapeshift-labs-frontier-react)
- [`siliconjungle/-shapeshift-labs-frontier-richtext`](https://github.com/siliconjungle/-shapeshift-labs-frontier-richtext)
- [`siliconjungle/-shapeshift-labs-frontier-realtime`](https://github.com/siliconjungle/-shapeshift-labs-frontier-realtime)
- [`siliconjungle/-shapeshift-labs-frontier-realtime-server`](https://github.com/siliconjungle/-shapeshift-labs-frontier-realtime-server)
- [`siliconjungle/-shapeshift-labs-frontier-realtime-websocket`](https://github.com/siliconjungle/-shapeshift-labs-frontier-realtime-websocket)
- [`siliconjungle/-shapeshift-labs-frontier-game`](https://github.com/siliconjungle/-shapeshift-labs-frontier-game)

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
  createScheduledLogSink,
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
- `createScheduledLogSink(sink, { scheduler })` defers sink writes through any structural scheduler with `schedule()`.
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
  logRegistryGraph,
  summarizeCrdtUpdate,
  summarizePatch,
  summarizeRegistryGraph
} from '@shapeshift-labs/frontier-logging/frontier';
```

`summarizePatch()` and `logPatch()` summarize compact Frontier patches. `summarizeCrdtUpdate()` and `logCrdtUpdate()` accept structural CRDT update objects while keeping `@shapeshift-labs/frontier-crdt` out of the logging import path. `summarizeRegistryGraph()` and `logRegistryGraph()` summarize Frontier registry graphs so action/query/state/component dependency edges, feature/package counts, tag counts, source-file counts, and touched paths can be attached to logs or AI evidence bundles. Binary CRDT update inputs are summarized by encoded byte length only.

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

Latest local package benchmark on Node v26.1.0, darwin arm64, 120 rounds:

| Fixture | Median | p95 |
| --- | ---: | ---: |
| Disabled lazy event | 0.07 us | 0.08 us |
| Sampled-out event | 0.08 us | 0.09 us |
| Buffered info event | 3.13 us | 3.35 us |
| Child context event | 3.21 us | 3.58 us |
| Redacted capped event | 4.23 us | 4.50 us |
| Patch summary | 0.31 us | 0.34 us |
| CRDT update object summary | 0.86 us | 0.93 us |
| Compact log batch encode, 64 records | 22.16 us | 22.83 us |
| Browser network telemetry | 3.34 us | 3.79 us |
| Browser breadcrumb sink | 5.08 us | 5.23 us |
| Browser offline buffer write | 1.45 us | 2.15 us |
| Browser telemetry batch encode, 128 events | 19.63 us | 20.16 us |

These are Frontier-only package measurements, not competitor comparisons.

## License

MIT. See [LICENSE](./LICENSE).
