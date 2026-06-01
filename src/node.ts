// @ts-ignore Node types are optional for browser-first consumers of the package.
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
// @ts-ignore Node types are optional for browser-first consumers of the package.
import { dirname } from 'node:path';
import type { LogSink } from './logging.ts';

export interface FileLogSinkOptions {
  append?: boolean;
  mkdir?: boolean;
  encoding?: string;
}

export function createFileLogSink(filePath: string, options: FileLogSinkOptions = {}): LogSink {
  const encoding = options.encoding || 'utf8';
  const shouldMkdir = options.mkdir !== false;
  const append = options.append !== false;
  let initialized = false;

  return {
    write(record) {
      if (!initialized) {
        if (shouldMkdir) mkdirSync(dirname(filePath), { recursive: true });
        if (!append) writeFileSync(filePath, '', { encoding });
        initialized = true;
      }
      appendFileSync(filePath, JSON.stringify(record) + '\n', { encoding });
    }
  };
}

export const createNdjsonFileLogSink = createFileLogSink;
