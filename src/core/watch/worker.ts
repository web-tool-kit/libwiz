import { parentPort, isMainThread } from 'node:worker_threads';
import { log, createTimer, createFileHash, optimizeMemory } from '@/utils';
import { initConfig } from '@/config';
import build from '@/core/build';
import runPostbuild, { unlinkFilesFromBuild } from '@/core/postbuild';
import type { CliOptions } from '@/types';

const fileHashes = new Map<string, string>();

// to keep status of first init
let isInit = false;

const actionOnWatch = async (
  event: 'add' | 'addDir' | 'change' | 'unlink' | 'unlinkDir',
  path: string,
  cliOptions: CliOptions,
) => {
  // init config on first run to prevent empty config
  await initConfig(cliOptions);

  // handle file hash management
  if (event === 'unlink') {
    fileHashes.delete(path);
    await unlinkFilesFromBuild([path]);
  } else if (event === 'unlinkDir') {
    // iterate through fileHashes to find files that were in the deleted directory
    for (const [filePath] of Array.from(fileHashes.entries())) {
      if (filePath.startsWith(path + '/')) {
        fileHashes.delete(filePath);
      }
    }
    await unlinkFilesFromBuild(path, true);
  }

  async function runBuildProcess() {
    if (isInit) {
      log.info('New change detected. Restarting build...');
    }
    const buildTimer = createTimer();
    try {
      isInit = true;
      await build();
      // memory optimization for long-running watch mode
      optimizeMemory();
    } catch (err) {
      throw err;
    }
    await runPostbuild(buildTimer);

    // notify main thread that build is completed
    if (!isMainThread && parentPort) {
      parentPort.postMessage({ type: 'completed', data: { event, path } });
    }
  }

  switch (event) {
    case 'add':
    case 'addDir':
    case 'change':
      const currentHash = await createFileHash(path);
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
};

type WorkerMessage = {
  type: string;
  data: unknown;
};

interface BuildWorkerProps {
  event: 'add' | 'addDir' | 'change' | 'unlink' | 'unlinkDir';
  path: string;
  cliOptions: CliOptions;
}

if (!isMainThread && parentPort) {
  parentPort.on('message', ({ type, data }: WorkerMessage) => {
    if (type === 'build') {
      const { event, path, cliOptions } = data as BuildWorkerProps;
      actionOnWatch(event, path, cliOptions).catch(err => {
        parentPort?.postMessage({
          type: 'error',
          data: {
            message: err instanceof Error ? err.message : String(err),
            stack: err instanceof Error ? err.stack : undefined,
          },
        });
      });
    }
  });
}
