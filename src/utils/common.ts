import resolveFrom from 'resolve-from';

export function magicImport<T = any>(moduleId: string): T {
  const fromProject = resolveFrom.silent(process.cwd(), moduleId);
  if (fromProject) {
    return require(fromProject) as T;
  }
  return require(moduleId) as T;
}

export function clearConsole() {
  if (process.stdin.isTTY) {
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
