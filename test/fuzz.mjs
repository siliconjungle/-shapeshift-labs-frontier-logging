import assert from 'node:assert';
import { diff } from '@shapeshift-labs/frontier';
import {
  createLogger,
  decodeLogBatch,
  encodeLogBatch
} from '../dist/index.js';
import {
  createBrowserTelemetryBuffer,
  decodeBrowserTelemetryBatch,
  encodeBrowserTelemetryBatch
} from '../dist/browser.js';
import {
  logCrdtUpdate,
  logPatch,
  summarizeCrdtUpdate,
  summarizePatch
} from '../dist/frontier.js';

const args = parseArgs(process.argv.slice(2));
const cases = readPositiveInt(args.cases, 500);
const seed = readPositiveInt(args.seed, 0x10a61e);
const rng = mulberry32(seed);

for (let id = 0; id < cases; id++) {
  const localRng = mulberry32((rng() * 0xffffffff) >>> 0);
  runCase(id, localRng);
}

console.log('frontier-logging fuzz passed cases=' + cases + ' seed=' + seed);

function runCase(id, rng) {
  const source = makeState(rng);
  const target = mutateState(source, rng);
  const patch = diff(source, target, { arrayKey: 'id', validate: true });
  const patchTelemetry = summarizePatch(patch, {
    includeByteLength: id % 3 === 0,
    pathSampleLimit: 4
  });
  assert.strictEqual(patchTelemetry.opCount, patch.length);
  assert.ok(patchTelemetry.pathSamples.length <= 4);

  const update = makeUpdate(id, rng);
  const crdtTelemetry = summarizeCrdtUpdate(update, {
    pathSampleLimit: 4,
    headSampleLimit: 4
  });
  assert.strictEqual(crdtTelemetry.actor, update.actor);
  assert.ok(crdtTelemetry.byteLength > 0);
  assert.ok(crdtTelemetry.heads.length <= 4);
  assert.ok(crdtTelemetry.logicalOpCount >= crdtTelemetry.opCount);

  let lazyCalls = 0;
  const logger = createLogger({
    level: id % 2 === 0 ? 'trace' : 'debug',
    context: { caseId: id, shard: id % 7 },
    bufferCapacity: 16,
    now: () => id
  });
  logger.trace('case.trace', () => {
    lazyCalls++;
    return { selected: true };
  });
  logPatch(logger, 'info', 'case.patch', patch, { ops: patch.length }, { pathSampleLimit: 4 });
  logCrdtUpdate(logger, 'info', 'case.crdt', update, { bytes: crdtTelemetry.byteLength }, { pathSampleLimit: 4 });
  if (id % 2 === 0) assert.strictEqual(lazyCalls, 1);
  else assert.strictEqual(lazyCalls, 0);

  const records = logger.snapshot();
  assert.deepStrictEqual(decodeLogBatch(encodeLogBatch(records)), records);

  const browserTelemetry = createBrowserTelemetryBuffer({
    sessionId: 'browser-fuzz-' + id,
    capacity: 8,
    maxBytes: 4096,
    now: () => id,
    capturePayload: id % 5 === 0,
    privateMode: id % 17 === 0,
    maxStringLength: 32,
    serviceUrls: [/telemetry\.example/]
  });
  browserTelemetry.breadcrumb({
    category: 'case',
    level: 'info',
    message: randomWord(rng) + ' user@example.com ' + Math.floor(rng() * 100000000),
    attributes: {
      token: 'secret-token-' + id,
      rows: source.rows
    }
  });
  browserTelemetry.network({
    url: id % 7 === 0 ? 'https://telemetry.example/ingest?token=secret' : 'https://app.example/api/' + id + '?token=secret',
    method: id % 2 === 0 ? 'post' : 'get',
    status: 200 + (id % 5),
    request: {
      headers: {
        Authorization: 'Bearer secret-token-' + id,
        'X-Case': String(id)
      },
      body: { token: 'secret-token-' + id, keep: randomWord(rng) }
    }
  });
  browserTelemetry.replay({
    data: {
      type: 'mutation',
      target: randomWord(rng),
      secret: 'secret-token-' + id
    }
  });
  const browserDecoded = decodeBrowserTelemetryBatch(encodeBrowserTelemetryBatch(browserTelemetry.snapshot(), {
    sessionId: browserTelemetry.sessionId,
    dropped: browserTelemetry.dropped,
    now: id
  }));
  assert.deepStrictEqual(browserDecoded, browserTelemetry.snapshot());
  const serializedBrowser = JSON.stringify(browserDecoded);
  assert.ok(!serializedBrowser.includes('user@example.com'));
  assert.ok(!serializedBrowser.includes('secret-token-'));
}

function makeState(rng) {
  const rows = [];
  const count = 1 + Math.floor(rng() * 5);
  for (let i = 0; i < count; i++) {
    rows.push({
      id: 'r' + i,
      score: Math.floor(rng() * 100),
      title: randomWord(rng)
    });
  }
  return {
    rows,
    meta: {
      tick: Math.floor(rng() * 1000),
      flag: rng() > 0.5
    },
    text: randomWord(rng) + randomWord(rng)
  };
}

function mutateState(source, rng) {
  const target = JSON.parse(JSON.stringify(source));
  target.meta.tick++;
  if (target.rows.length > 0) target.rows[Math.floor(rng() * target.rows.length)].score += 1 + Math.floor(rng() * 10);
  if (rng() > 0.35) target.rows.push({ id: 'r' + target.rows.length, score: Math.floor(rng() * 100), title: randomWord(rng) });
  if (rng() > 0.5) target.text += randomWord(rng);
  else target.meta.flag = !target.meta.flag;
  return target;
}

function makeUpdate(id, rng) {
  const actor = 'logging-fuzz-' + id;
  const first = randomWord(rng);
  const maybeSecond = rng() > 0.5 ? randomWord(rng) : '';
  const ops = [
    {
      type: 'set',
      id: actor + ':1',
      actor,
      seq: 1,
      deps: [],
      path: ['meta', 'tick'],
      value: id
    },
    {
      type: 'textRun',
      id: actor + ':2',
      actor,
      seq: 2,
      deps: [actor + ':1'],
      path: ['body'],
      text: first,
      count: first.length
    }
  ];
  if (maybeSecond) {
    ops.push({
      type: 'textRun',
      id: actor + ':3',
      actor,
      seq: 2 + first.length,
      deps: [actor + ':2'],
      path: ['body'],
      text: maybeSecond,
      count: maybeSecond.length
    });
  }
  return {
    actor,
    seq: 1,
    deps: [],
    ops,
    metadata: { caseId: id }
  };
}

function randomWord(rng) {
  const length = 1 + Math.floor(rng() * 8);
  let out = '';
  for (let i = 0; i < length; i++) out += String.fromCharCode(97 + Math.floor(rng() * 26));
  return out;
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--cases') out.cases = argv[++i];
    else if (arg === '--seed') out.seed = argv[++i];
    else if (arg === '--help' || arg === '-h') {
      console.log('Usage: node test/fuzz.mjs [--cases 500] [--seed 1099294]');
      process.exit(0);
    } else {
      throw new Error('unknown argument: ' + arg);
    }
  }
  return out;
}

function readPositiveInt(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : fallback;
}

function mulberry32(seedValue) {
  let state = seedValue >>> 0;
  return function next() {
    state += 0x6D2B79F5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
