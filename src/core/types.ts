import path from 'node:path';
import glob from 'fast-glob';
import fse from 'fs-extra';
import picocolors from 'picocolors';
import { exec, removeBuildInfoFiles } from '../utils';
import configManager from '../config';

const config = configManager();

async function types() {
  const packageRoot = config.root;
  const tsconfigPath = config.tsConfig;

  if (!fse.existsSync(tsconfigPath)) {
    let packageJsonFile: string | null = path.resolve(
      packageRoot,
      'package.json',
    );

    if (!fse.existsSync(packageJsonFile)) {
      packageJsonFile = null;
    }

    const packageJson = packageJsonFile
      ? JSON.parse(fse.readFileSync(packageJsonFile, { encoding: 'utf8' }))
      : { name: packageRoot };

    throw new Error(
      `The package root needs to contain a 'tsconfig.build.json' or 'tsconfig.json'. ` +
        `The package is '${packageJson.name}'`,
    );
  }

  const { stderr } = await exec(['npx', 'tsc', '-b', tsconfigPath].join(' '));

  if (stderr) {
    throw new Error(`TS build types failed with \n${stderr}`);
  }

  const publishDir = path.join(packageRoot, 'dist');
  const declarationFiles = await glob('**/*.d.ts', {
    absolute: true,
    cwd: publishDir,
  });

  if (declarationFiles.length === 0) {
    throw new Error(`Unable to find declaration files in '${publishDir}'`);
  }

  async function removeUnWantedImports(declarationFile) {
    const code = await fse.readFile(declarationFile, { encoding: 'utf8' });
    const fixedCode = code
      .replace(/import\s+['"].+\.(css|json|svg|jpg|png|webp)['"];/gi, '')
      .replace(/\n{2,}/g, '\n');
    await fse.writeFile(declarationFile, fixedCode);
  }

  await Promise.all(
    declarationFiles.map(async declarationFile => {
      try {
        await removeUnWantedImports(declarationFile);
        console.log(
          `${picocolors.bgGreen(`OK`)} '${
            declarationFile.split('packages/')[1] ||
            declarationFile.split('apps/')[1] ||
            declarationFile
          }'`,
        );
      } catch (error) {
        console.error(error);
      }
    }),
  );

  await removeBuildInfoFiles(packageRoot);
}

export default types;
