import { parentPort, isMainThread } from 'node:worker_threads';
import { globSync } from 'fast-glob';
import log from '../../utils/log';
import { createFileHash } from '../../utils';
import configManager from '../../config';
import build from '../build';
import runPostbuild from '../postbuild';
import type { BuildProps } from '../../types';

export interface WatchProps extends BuildProps {
  copy?: boolean;
}

const config = configManager();
const fileHashes = new Map();

// to keep status of first init
let isInit = false;

const actionOnWatch = async (
  event: 'add' | 'addDir' | 'change' | 'unlink' | 'unlinkDir',
  path: string,
  props: WatchProps,
) => {
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
      await build(buildProps);
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
    parentPort.postMessage({ type: 'completed' });
  }
};

parentPort.on(
  'message',
  (data: {
    event: 'add' | 'addDir' | 'change' | 'unlink' | 'unlinkDir';
    path: string;
    props: WatchProps;
  }) => {
    const { event, path, props } = data;
    actionOnWatch(event, path, props);
  },
);
