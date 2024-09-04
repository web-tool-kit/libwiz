import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { globSync } from 'fast-glob';
import chokidar from 'chokidar';
import { log, clearConsole } from '../utils';
import configManager from '../config';
import build from './build';
import type { BuildProps } from './build';
import runPostbuild from './postbuild';

export interface WatchProps extends BuildProps {
  copy?: boolean;
}

const config = configManager();

const fileHashes = new Map();

function getFileHash(path: string) {
  try {
    return crypto.createHash('md5').update(fs.readFileSync(path)).digest('hex');
  } catch (error) {
    return null;
  }
}

let currentAbortController: AbortController | null = null;

function onAbort() {
  new Error(
    '[internal] new process initialized, previous process aborted via signal',
  );
}

function debounce<T extends (...args: readonly any[]) => unknown>(
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

// to keep status of first init
let isInit = false;

const actionOnWatch = debounce(
  async (
    event: 'add' | 'addDir' | 'change' | 'unlink' | 'unlinkDir',
    path: string,
    props: WatchProps,
  ) => {
    if (currentAbortController) {
      currentAbortController.abort();
      const { signal } = currentAbortController;
      if (signal) {
        signal.removeEventListener('abort', onAbort);
      }
    }
    currentAbortController = new AbortController();

    const { signal } = currentAbortController;

    if (signal) {
      signal.addEventListener('abort', onAbort);
    }

    const { copy, ...buildProps } = props;

    if (event === 'unlink') {
      fileHashes.delete(path);
    } else if (event === 'unlinkDir') {
      globSync(`${path}/**/*`, {
        ignore: config.ignore,
      }).forEach(file => {
        fileHashes.delete(file);
      });
    }

    async function runBuildProcess() {
      if (isInit) {
        log.success(`Change detected. Restarting build...`);
      }
      try {
        isInit = true;
        await build(buildProps, signal);
      } catch (err) {
        if (err.name === 'AbortError') {
          return;
        }
        throw err;
      }
      if (!(signal && signal.aborted)) {
        await runPostbuild();
      }
    }

    switch (event) {
      case 'add':
      case 'addDir':
      case 'change':
        const currentHash = getFileHash(path);
        const previousHash = fileHashes.get(path);
        let changeFound = currentHash === null;
        if (currentHash !== null) {
          if (currentHash !== previousHash) {
            fileHashes.set(path, currentHash);
            changeFound = true;
          }
        }
        if (changeFound) {
          await runBuildProcess();
        }
        break;
      case 'unlink':
      case 'unlinkDir':
        await runBuildProcess();
      default:
        break;
    }
  },
);

async function watch(watchProps: WatchProps) {
  clearConsole();
  log.success(`Running LibWiz in watch mode...`);
  const watcher = chokidar.watch(`${path.resolve(config.root, './src')}/**/*`, {
    ignored: config.ignore,
    persistent: true,
    alwaysStat: true,
  });
  watcher.on('all', async (event, path) => {
    actionOnWatch(event, path, watchProps);
  });
}

export default watch;
