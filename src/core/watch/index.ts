import chokidar from 'chokidar';
import log from '@/utils/log';
import { getConfig } from '@/config';
import type { CliOptions } from '@/types';
import WorkerNodes from './WorkerNodes';

const watchWorker = new WorkerNodes();

async function watch(cliOptions: CliOptions) {
  const config = getConfig();
  log.info('Running in watch mode...');

  const watcher = chokidar.watch(`${config.srcPath}/**/*`, {
    ignored: config.ignore,
    persistent: true,
    alwaysStat: true,
    awaitWriteFinish: {
      pollInterval: 100,
      stabilityThreshold: 300,
    },
  });

  watcher.on('all', async (event, path) => {
    // always send the event to worker, let it handle hash checking
    // this ensures consistent behavior and prevents race conditions
    watchWorker.run({ event, path, cliOptions });
  });
}

export default watch;
