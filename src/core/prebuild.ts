import fse from 'fs-extra';
import api from '../api';
import { removeBuildInfoFiles } from '../utils';

async function prebuild() {
  const { buildPath } = api.config;
  if (fse.existsSync(buildPath)) {
    fse.removeSync(buildPath);
  }
  await removeBuildInfoFiles(process.cwd());
}

export default prebuild;
