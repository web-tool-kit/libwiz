import fs from 'node:fs';
import crypto from 'node:crypto';
import resolveFrom from 'resolve-from';
import type { Config } from '../types';

export const isTTY = process.stdout.isTTY || process.env.CI;
// isProgressDisabled function is used to check if the progress bar should be disabled
export const isProgressDisabled = () =>
  process.env.LIBWIZ_ENABLE_PROGRESS !== 'true';

export function magicImport<T = any>(
  moduleId: string,
  options: Pick<Config, 'root' | 'workspace'> = {},
): T {
  const { root = process.cwd(), workspace } = options;
  const fromProject = resolveFrom.silent(root, moduleId);
  if (fromProject) {
    return require(fromProject) as T;
  } else if (workspace) {
    const fromWorkspace = resolveFrom.silent(root, moduleId);
    if (fromWorkspace) {
      return require(fromWorkspace) as T;
    }
  }
  return require(moduleId) as T;
}

export function parallel(promises: Promise<unknown>[]) {
  return Promise.all(promises);
}

export async function sequential(fxnArr: (unknown | Promise<unknown>)[]) {
  const results = [];
  for (const fn of fxnArr) {
    const result = fn instanceof Promise ? await fn : fn;
    results.push(result as never);
  }
  return results;
}

export function debounce<T extends (...args: readonly unknown[]) => unknown>(
  func: T,
  timeout = 400,
) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return function (...args: Parameters<T>) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      func(...args);
    }, timeout);
  };
}

export function createFileHash(path: string) {
  try {
    return crypto.createHash('md5').update(fs.readFileSync(path)).digest('hex');
  } catch (error) {
    return null;
  }
}

export function initCli(shouldClearScreen = true) {
  if (!process.stdout.isTTY || !shouldClearScreen) return;

  process.stdout.write('\u001B[?25l');
  function restoreCursor() {
    process.stdout.write('\u001B[?25h');
    process.exit(0);
  }
  ['SIGINT', 'SIGTERM', 'exit'].map(event => {
    process.on(event, restoreCursor);
  });
}

export function isPlainObject(item: unknown) {
  return item && typeof item === 'object' && !Array.isArray(item);
}

export function mergeDeep(
  target: Record<string, any>,
  source: Record<string, any>,
) {
  for (let key in source) {
    if (source.hasOwnProperty(key)) {
      if (isPlainObject(source[key])) {
        if (!target[key]) {
          target[key] = {};
        }
        mergeDeep(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
  }
}
