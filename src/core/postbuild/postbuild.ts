import path from 'node:path';
import fse from 'fs-extra';
import glob from 'fast-glob';
import { getConfig } from '@/config';
import pc from '@/utils/picocolors';
import { log, parallel, sequential, createTimer } from '@/utils';
import { isTarget, copyRequiredFiles } from './utils';

async function postbuild(getBuildTime: ReturnType<typeof createTimer>) {
  const { root, srcPath, output, lib } = getConfig();

  const cjsPath = lib?.cjs?.output?.path as string;
  const esmPath = lib?.esm?.output?.path as string;

  const [hasCJS, hasESM] = await Promise.all([
    isTarget(output.target, 'cjs') && fse.pathExists(cjsPath),
    isTarget(output.target, 'esm') && fse.pathExists(esmPath),
  ]);

  /**
   * Following function help to move project files like
   * README, LICENCE into dist if exist from root
   */
  async function copyLibraryFiles() {
    await Promise.all(
      ['./README.md', './LICENSE'].map(async file => {
        const sourcePath = path.resolve(root, file);
        if (await fse.pathExists(sourcePath)) {
          const targetPath = path.resolve(output.dir, path.basename(file));
          await fse.copy(sourcePath, targetPath);
        }
      }),
    );
  }

  /**
   * createModulePackages used to create tree-shakeable package.json in each module of project
   * in case of esm and cjs co exist and esm path is in root then we create module packages
   * ```js
   * import { someModule } from 'your-lib';
   * const { someModule } = require('your-lib');
   *
   * import someModule from 'your-lib/some-module';
   * const someModule = require('your-lib/some-module');
   * ```
   */
  async function createModulePackages() {
    // in case esm and cjs co exist then we create module packages
    if (!(hasESM && hasCJS)) return;

    // if esm path is not in root then we don't create module packages
    // in case or root it will be empty string which is falsy
    if (path.relative(output.dir, esmPath)) return;

    const packageData = JSON.parse(
      await fse.readFile(path.resolve(root, './package.json'), 'utf8'),
    );

    const directoryPackages = glob
      .sync('*/index.{js,ts,tsx}', { cwd: srcPath })
      .map(path.dirname);

    await Promise.all(
      directoryPackages.map(async directoryPackage => {
        const packageJsonPath = path.join(
          output.dir,
          directoryPackage,
          'package.json',
        );

        const esmDir = path.join(esmPath, directoryPackage);
        const cjsDir = path.join(cjsPath, directoryPackage);

        const packageJson: Record<string, any> = {
          name: `${packageData.name}/${directoryPackage}`,
          version: packageData.version,
          sideEffects: false,
          module: './index.js',
          main: path.posix.join(path.relative(esmDir, cjsDir), 'index.js'),
          types: './index.d.ts',
        };

        const [moduleEntryExists, mainEntryExists, typingsEntryExist] =
          await Promise.all([
            fse.pathExists(
              path.resolve(path.dirname(packageJsonPath), packageJson.module),
            ),
            fse.pathExists(
              path.resolve(path.dirname(packageJsonPath), packageJson.main),
            ),
            fse.pathExists(
              path.resolve(path.dirname(packageJsonPath), packageJson.types),
            ),
          ]);

        if (!moduleEntryExists) {
          delete packageJson.module;
        }
        if (!mainEntryExists) {
          delete packageJson.main;
        }
        if (!typingsEntryExist) {
          delete packageJson.types;
        }

        if (!packageJson.main && packageJson.module) {
          packageJson.main = packageJson.module;
          delete packageJson.module;
        }

        await fse.writeFile(
          packageJsonPath,
          JSON.stringify(packageJson, null, 2),
        );
        return packageJsonPath;
      }),
    );
  }

  /**
   * Function ensure build dir exist
   */
  async function ensureBuildDirExists() {
    if (!(await fse.pathExists(output.dir))) {
      await fse.mkdir(output.dir, { recursive: true });
    }
  }

  /**
   * Copy type definition if exist in module files
   */
  async function typescriptCopy() {
    if (!(await fse.pathExists(output.dir))) {
      log.warn(`[types] path ${output.dir} does not exists`);
      return [];
    }
    const files = await glob('**/*.d.ts', { cwd: srcPath });
    await Promise.all(
      files.map(file =>
        fse.copy(path.resolve(srcPath, file), path.resolve(output.dir, file)),
      ),
    );
  }

  async function createPackageFile() {
    const {
      scripts,
      devDependencies,
      workspaces,
      publishConfig,
      ...restPackageData
    } = JSON.parse(
      await fse.readFile(path.resolve(root, './package.json'), 'utf8'),
    );

    const cjsDir = path.relative(output.dir, cjsPath);
    const esmDir = path.relative(output.dir, esmPath);

    const newPackageData = {
      ...restPackageData,
      private: false,
    };

    // only add main field if CJS output exists
    if (hasCJS) {
      newPackageData.main = (await fse.pathExists(
        path.join(cjsPath, 'index.js'),
      ))
        ? `.${cjsDir ? `/${cjsDir}` : ''}/index.js`
        : './index.js';
    }

    // only add module field if ESM output exists
    if (hasESM) {
      newPackageData.module = (await fse.pathExists(
        path.join(esmPath, 'index.js'),
      ))
        ? `.${esmDir ? `/${esmDir}` : ''}/index.js`
        : './index.js';
    }

    // if only ESM output exists, use module as the main entry point
    if (hasESM && !hasCJS) {
      newPackageData.main = newPackageData.module;
      delete newPackageData.module;
    }

    // verify that the specified entry points actually exist
    if (newPackageData.main) {
      const mainEntryExists = await fse.pathExists(
        path.resolve(output.dir, newPackageData.main),
      );
      if (!mainEntryExists) {
        delete newPackageData.main;
      }
    }

    if (newPackageData.module) {
      const moduleEntryExists = await fse.pathExists(
        path.resolve(output.dir, newPackageData.module),
      );
      if (!moduleEntryExists) {
        delete newPackageData.module;
      }
    }

    // if esm path exists then by default types will be in esm path else in cjs path
    const dtsIndex = path.resolve(hasESM ? esmPath : cjsPath, './index.d.ts');
    // if dts file exists then add it to package.json
    if (await fse.pathExists(dtsIndex)) {
      newPackageData.types = `./${path.relative(output.dir, dtsIndex)}`;
    }

    await fse.writeFile(
      path.resolve(output.dir, './package.json'),
      JSON.stringify(newPackageData, null, 2),
      'utf8',
    );
  }
  await ensureBuildDirExists();
  try {
    await sequential([
      typescriptCopy(),
      copyRequiredFiles(),
      parallel([createModulePackages(), createPackageFile()]),
      copyLibraryFiles(),
    ]);
    const buildTime = getBuildTime();
    log.done(
      `Build completed successfully in ${pc.bold(buildTime.toFixed(1))}s`,
    );
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

export default postbuild;
