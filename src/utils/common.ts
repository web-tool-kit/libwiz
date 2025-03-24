import fs from 'node:fs';
import crypto from 'node:crypto';
import resolveFrom from 'resolve-from';
import log from './log';
import type { Config } from '../types';

// this function use to resolve is module from client project
// this will resolve from root firt first and then workspace
export function magicImportClient<T = any>(
  moduleId: string,
  options: Pick<Config, 'root' | 'workspace'> = {},
): T {
  const { root = process.cwd(), workspace } = options;
  const fromProject = resolveFrom.silent(root, moduleId);
  if (fromProject) {
    return require(fromProject) as T;
  } else if (workspace) {
    const fromWorkspace = resolveFrom.silent(workspace, moduleId);
    if (fromWorkspace) {
      return require(fromWorkspace) as T;
    }
  }
  return null;
}

// this function use to resolve is module from client project and
// libwiz default it will fall to libwiz
export function magicImport<T = any>(
  moduleId: string,
  options: Pick<Config, 'root' | 'workspace'> = {},
): T {
  const module = magicImportClient<T>(moduleId, options);
  if (module) {
    return module as T;
  }
  return require(moduleId) as T;
}

export function clearConsole() {
  if (process.stdout.isTTY) {
    process.stdout.write(
      process.platform === 'win32' ? '\x1B[2J\x1B[0f' : '\x1B[2J\x1B[3J\x1B[H',
    );
  }
}

export function parallel(promises: Promise<unknown>[]) {
  return Promise.all(promises);
}

export async function sequential(fxnArr: (unknown | Promise<unknown>)[]) {
  const results = [];
  for (const fn of fxnArr) {
    if (fn instanceof Promise) {
      results.push(await fn);
    } else {
      results.push(fn);
    }
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
    const fileBuffer = fs.readFileSync(path);
    return crypto
      .createHash('md5')
      .update(fileBuffer as crypto.BinaryLike)
      .digest('hex');
  } catch (error) {
    return null;
  }
}

export function isPlainObject(item: unknown) {
  return item && typeof item === 'object' && !Array.isArray(item);
}

export function mergeDeep<T extends Record<string, any>>(
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
  return target as T;
}

export function doOrDie<T extends unknown>(fn: (...args: unknown[]) => T) {
  try {
    return fn();
  } catch (err) {
    log.error(err.toString());
    console.error(err);
    process.exit(1);
  }
}
