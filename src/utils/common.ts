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

export type TrackProgressCallback = (progress: {
  completed: number;
  total: number;
  percentage: string;
}) => void;

export function trackProgress<T>(
  promises: Promise<T>[],
  progressCallback?: TrackProgressCallback,
): Promise<T[]> {
  if (typeof progressCallback !== 'function') {
    return Promise.all(promises);
  }

  const total = promises.length;
  let completed = 0;

  progressCallback({ completed, total, percentage: '0' });

  return Promise.all(
    promises.map(
      p =>
        new Promise<T>((resolve, reject) => {
          p.then(resolve, reject).finally(() => {
            completed += 1;
            const percentage = ((completed / total) * 100).toFixed(2);
            progressCallback({ completed, total, percentage });
          });
        }),
    ),
  );
}

export function initCli() {
  if (!process.stdin.isTTY) return;

  process.stdin.write('\u001B[?25l');
  function restoreCursor() {
    process.stdin.write('\u001B[?25h');
    process.exit(0);
  }
  ['SIGINT', 'SIGTERM', 'exit'].map(event => {
    process.on(event, restoreCursor);
  });
}
