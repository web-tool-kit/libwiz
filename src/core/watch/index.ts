import chokidar from 'chokidar';
import api from '../../api';
import log from '../../utils/log';
import { clearConsole } from '../../utils';
import WorkerNodes from './WorkerNodes';

const watchWorker = new WorkerNodes();

async function watch() {
  const config = api.config;
  clearConsole();
  log.success(`Running in watch mode...\n`);

  const watcher = chokidar.watch(`${config.srcPath}/**/*`, {
    ignored: config.ignore,
    persistent: true,
    alwaysStat: true,
  });

  watcher.on('all', async (event, path) => {
    await watchWorker.terminate();
    watchWorker.run({ event, path });
  });
}

export default watch;
