import { parentPort, isMainThread } from 'node:worker_threads';
import { globSync } from 'fast-glob';
import api from '../../api';
import log from '../../utils/log';
import { createFileHash } from '../../utils';
import build from '../build';
import runPostbuild from '../postbuild';

const fileHashes = new Map();

// to keep status of first init
let isInit = false;

const actionOnWatch = async (
  event: 'add' | 'addDir' | 'change' | 'unlink' | 'unlinkDir',
  path: string,
) => {
  const config = api.getConfig();

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
      await build();
    } catch (err) {
      throw err;
    }
    await runPostbuild();
  }

  switch (event) {
    case 'add':
    case 'addDir':
    case 'change':
      const currentHash = createFileHash(path);
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

  if (!isMainThread && parentPort) {
    parentPort.postMessage({ type: 'completed', data: { event, path } });
  }
};

type WorkerMessage = {
  type: string;
  data: unknown;
};

interface BuildWorkerProps {
  event: 'add' | 'addDir' | 'change' | 'unlink' | 'unlinkDir';
  path: string;
}

if (!isMainThread && parentPort) {
  parentPort.on('message', ({ type, data }: WorkerMessage) => {
    if (type === 'build') {
      const { event, path } = data as BuildWorkerProps;
      actionOnWatch(event, path);
    }
  });
}
