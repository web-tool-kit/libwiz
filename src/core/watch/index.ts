import chokidar from 'chokidar';
import log from '../../utils/log';
import { clearConsole } from '../../utils';
import { getConfig } from '../../config';
import type { WatchProps } from '../../types';
import WorkerNodes from './WorkerNodes';

const watchWorker = new WorkerNodes();

async function watch(props: WatchProps) {
  const config = getConfig();
  clearConsole();
  log.success(`Running in watch mode...\n`);

  const watcher = chokidar.watch(`${config.srcPath}/**/*`, {
    ignored: config.ignore,
    persistent: true,
    alwaysStat: true,
  });

  watcher.on('all', async (event, path) => {
    await watchWorker.terminate();
    watchWorker.run({ event, path, props });
  });
}

export default watch;
