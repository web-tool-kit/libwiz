import fse from 'fs-extra';
import { getConfig } from '@/config';
import { removeBuildInfoFiles } from '@/utils';

async function prebuild() {
  const { buildPath } = getConfig();
  if (fse.existsSync(buildPath)) {
    fse.removeSync(buildPath);
  }
  await removeBuildInfoFiles(process.cwd());
}

export default prebuild;
