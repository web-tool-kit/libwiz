import fse from 'fs-extra';
import glob from 'fast-glob';
import log from './log';

async function removeBuildInfoFiles(cwd: string): Promise<void> {
  if (!cwd) {
    log.warn('cwd is not available to remove tsbuildinfo');
    return;
  }
  const typeBuildInfoFiles = await Promise.all([
    await glob('**/*.tsbuildinfo', {
      cwd,
      absolute: true,
      ignore: ['**/node_modules/**'],
    }),
  ]);
  await Promise.all(
    typeBuildInfoFiles.map(dirs => {
      return Promise.all(dirs.map(file => fse.unlink(file)));
    }),
  );
}

export default removeBuildInfoFiles;
