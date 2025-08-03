import fs from 'node:fs';
import crypto from 'node:crypto';

export const isTTY = process.stdout.isTTY || process.env.CI;
// isProgressDisabled function is used to check if the progress bar should be disabled
export const isProgressDisabled = () =>
  process.env.LIBWIZ_ENABLE_PROGRESS !== 'true';

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

export function isPlainObject(obj: unknown) {
  if (typeof obj !== 'object' || obj === null) return false;

  let proto = obj;
  while (Object.getPrototypeOf(proto) !== null) {
    proto = Object.getPrototypeOf(proto);
  }

  return (
    Object.getPrototypeOf(obj) === proto || Object.getPrototypeOf(obj) === null
  );
}

export function clone<T = unknown>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => clone(item)) as T;
  }

  if (obj instanceof Map) {
    const clonedMap = new Map();
    obj.forEach((value, key) => clonedMap.set(clone(key), clone(value)));
    return clonedMap as unknown as T;
  }

  if (obj instanceof RegExp) {
    const re = new RegExp(obj.source, obj.flags);
    re.lastIndex = obj.lastIndex;
    return re as T;
  }

  if (isPlainObject(obj)) {
    const cloned = {} as T;
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        cloned[key] = clone(obj[key]);
      }
    }
    return cloned;
  }

  return obj;
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

/**
 * when this function is called it starts the timer and returns a function,
 * when that called it returns the time since the timer started
 */
export function createTimer() {
  const startTime = Date.now();
  return () => {
    const stopTime = Date.now();
    const totalTime = (stopTime - startTime) / 1000;
    return totalTime;
  };
}
