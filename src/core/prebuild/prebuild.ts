import fse from 'fs-extra';
import { getConfig } from '@/config';
import { removeBuildInfoFiles } from '@/utils';

async function prebuild() {
  const { output } = getConfig();
  if (fse.existsSync(output.dir)) {
    fse.removeSync(output.dir);
  }
  await removeBuildInfoFiles(process.cwd());
}

export default prebuild;
