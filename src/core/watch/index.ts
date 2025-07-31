import chokidar from 'chokidar';
import log from '@/utils/log';
import { getConfig } from '@/config';
import type { CliProps } from '@/types';
import WorkerNodes from './WorkerNodes';

const watchWorker = new WorkerNodes();

async function watch(cliProps: CliProps) {
  const config = getConfig();
  log.info('Running in watch mode...');

  const watcher = chokidar.watch(`${config.srcPath}/**/*`, {
    ignored: config.ignore,
    persistent: true,
    alwaysStat: true,
  });

  watcher.on('all', async (event, path) => {
    await watchWorker.terminate();
    watchWorker.run({ event, path, cliProps });
  });
}

export default watch;
