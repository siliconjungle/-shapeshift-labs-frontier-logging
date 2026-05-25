# Frontier Logging

Reserved package name for a future standalone Frontier logging and telemetry package.

This package is not ready for production use. It exists so the package and repository names are reserved while Frontier logging, sinks, exporters, and benchmark trace boundaries are finalized.

- npm: [`@shapeshift-labs/frontier-logging`](https://www.npmjs.com/package/@shapeshift-labs/frontier-logging)
- source: [`siliconjungle/-shapeshift-labs-frontier-logging`](https://github.com/siliconjungle/-shapeshift-labs-frontier-logging)
- core package: [`@shapeshift-labs/frontier`](https://www.npmjs.com/package/@shapeshift-labs/frontier)
- license: MIT

## Intended Scope

When this package graduates from placeholder status, it is expected to contain:

- structured Frontier log records and bounded buffers;
- redaction, sampling, payload caps, and privacy controls;
- browser, NDJSON/file, and Node sinks;
- OpenTelemetry, Perfetto, and benchmark trace exporters;
- patch, state, codec, and CRDT summary helpers behind explicit imports.

The current implementation remains in Frontier core subpaths until the standalone boundary is ready. Core logging should stay opt-in and light, with heavier Frontier adapters and exporters behind separate import paths.

## Current Status

Use [`@shapeshift-labs/frontier`](https://www.npmjs.com/package/@shapeshift-labs/frontier) and its logging subpaths while this package is reserved:

```ts
import { createLogger } from '@shapeshift-labs/frontier/logging';
```

The standalone logging package is reserved only. No runtime API is exported yet.

## Package Family

Published or active packages:

- [`@shapeshift-labs/frontier`](https://www.npmjs.com/package/@shapeshift-labs/frontier)
- [`@shapeshift-labs/frontier-codec`](https://www.npmjs.com/package/@shapeshift-labs/frontier-codec)
- [`@shapeshift-labs/frontier-mutation`](https://www.npmjs.com/package/@shapeshift-labs/frontier-mutation)

Reserved future packages:

- `@shapeshift-labs/frontier-engine`
- `@shapeshift-labs/frontier-state`
- `@shapeshift-labs/frontier-crdt`
- `@shapeshift-labs/frontier-crdt-sync`
- `@shapeshift-labs/frontier-richtext`
- `@shapeshift-labs/frontier-state-cache`
- `@shapeshift-labs/frontier-event-log`
- `@shapeshift-labs/frontier-schema`

## License

MIT. See [LICENSE](./LICENSE).
