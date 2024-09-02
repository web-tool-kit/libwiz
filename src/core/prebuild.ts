import fse from 'fs-extra';
import { removeBuildInfoFiles } from '../utils';

async function prebuild(argv: { outDir: string }) {
  const { outDir } = argv;
  if (fse.existsSync(outDir)) {
    fse.removeSync(outDir);
  }
  await removeBuildInfoFiles(process.cwd());
}

export default prebuild;
