import path from 'node:path';
import glob from 'fast-glob';
import fse from 'fs-extra';
import pc from 'picocolors';
import { exec, log, delay, removeBuildInfoFiles } from '../utils';
import createProgressLoader from '../utils/loader';
import { getConfig } from '../config';

async function types() {
  const { root, tsConfig, buildPath, debug } = getConfig();
  const packageRoot = root;
  const tsconfigPath = tsConfig;

  let step = 0;
  const loader = createProgressLoader(5);
  loader.updateProgressText('Generating types...');
  loader.track(step++);

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
  await delay(300);
  loader.track(step++);

  const { stderr } = await exec(['npx', 'tsc', '-b', tsconfigPath].join(' '));
  loader.track(step++);

  if (stderr) {
    log.warn(`[types] ${stderr}`);
  }

  const declarationFiles = await glob('**/*.d.ts', {
    absolute: true,
    cwd: buildPath,
  });
  await delay(200);
  loader.track(step++);

  if (declarationFiles.length === 0) {
    throw new Error(`Unable to find declaration files in '${buildPath}'`);
  }

  async function removeUnWantedImports(declarationFile) {
    const code = await fse.readFile(declarationFile, { encoding: 'utf8' });
    const fixedCode = code
      .replace(/import\s+['"].+\.(css|json|svg|jpg|png|webp)['"];/gi, '')
      .replace(/\n{2,}/g, '\n');
    await fse.writeFile(declarationFile, fixedCode);
  }

  let output = [];
  await Promise.all(
    declarationFiles.map(async declarationFile => {
      try {
        await removeUnWantedImports(declarationFile);
        output.push(
          `${pc.bgGreen(`OK`)} '${
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
  await delay(200);
  loader.track(step++);

  await removeBuildInfoFiles(packageRoot);
  await delay(200);
  loader.track(step++);
  loader.stop();
  if (debug) {
    console.log(output.join('\n'));
  }
}

export default types;
