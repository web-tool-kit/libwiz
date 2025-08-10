import path from 'node:path';
import fse from 'fs-extra';
import glob from 'fast-glob';
import { getConfig } from '@/config';
import pc from '@/utils/picocolors';
import { log, parallel, sequential, createTimer } from '@/utils';

/**
 * Copy required files of module in there folder
 */
export async function copyRequiredFiles() {
  const { assets, srcPath, output, lib } = getConfig();

  if (!assets || (Array.isArray(assets) && assets.length === 0)) {
    return;
  }

  if (!(await fse.pathExists(output.dir))) {
    log.warn(`build path ${output.dir} does not exists to copy assets`);
    return [];
  }

  // get custom paths from config or use defaults
  const cjsPath = lib?.cjs?.output?.path as string;
  const esmPath = lib?.esm?.output?.path as string;

  const [hasCJS, hasESM] = await Promise.all([
    fse.pathExists(cjsPath),
    fse.pathExists(esmPath),
  ]);

  const files = await glob(assets, {
    cwd: srcPath,
    dot: true,
  });

  const task: Promise<void>[] = [];

  files.forEach(file => {
    if (hasCJS) {
      task.push(
        fse.copy(path.resolve(srcPath, file), path.resolve(cjsPath, file)),
      );
    }
    if (hasESM) {
      task.push(
        fse.copy(path.resolve(srcPath, file), path.resolve(esmPath, file)),
      );
    }
  });
  await Promise.all(task);
}

// function to unlink files from build path, this expect files paths exist in src
// this used when watch mode is enabled and we need to unlink files from build path
// when file is deleted in src path
export async function unlinkFilesFormBuild(
  files: string | string[],
  isDir: boolean = false,
) {
  const { srcPath, lib } = getConfig();
  const cjsPath = lib?.cjs?.output?.path as string;
  const esmPath = lib?.esm?.output?.path as string;

  const [hasCJS, hasESM] = await Promise.all([
    fse.pathExists(cjsPath),
    fse.pathExists(esmPath),
  ]);

  const tasks: Promise<void>[] = [];
  const isTS = (ext: string) => ['.ts', '.tsx', '.mts'].includes(ext);

  async function removeFile(file: string) {
    const relativePath = path.relative(srcPath, file);

    // helper function to remove from both CJS and ESM paths
    const removeFromBuildPaths = async (targetPath: string) => {
      if (hasCJS) {
        const cjsTarget = path.resolve(cjsPath, targetPath);
        if (await fse.pathExists(cjsTarget)) {
          tasks.push(fse.remove(cjsTarget));
        }
      }

      if (hasESM) {
        const esmTarget = path.resolve(esmPath, targetPath);
        if (await fse.pathExists(esmTarget)) {
          tasks.push(fse.remove(esmTarget));
        }
      }
    };

    if (isDir) {
      // for directories, remove directly from both CJS and ESM paths
      await removeFromBuildPaths(relativePath);
    } else {
      // for files, handle extension conversion
      const dirName = path.dirname(relativePath);
      const fileName = path.basename(relativePath);
      const ext = path.extname(fileName);

      const buildFileName =
        // in case file is ts group then we need to unlink the js file
        // but for dts files we do not convert to js
        isTS(ext) && !fileName.endsWith('.d.ts')
          ? fileName.replace(ext, '.js')
          : fileName;

      await removeFromBuildPaths(path.join(dirName, buildFileName));
    }
  }

  if (Array.isArray(files)) {
    await Promise.all(files.map(removeFile));
  } else {
    await removeFile(files);
  }

  await Promise.all(tasks);
}

async function postbuild(getBuildTime: ReturnType<typeof createTimer>) {
  const { root, srcPath, output, lib } = getConfig();

  const cjsPath = lib?.cjs?.output?.path as string;
  const esmPath = lib?.esm?.output?.path as string;

  const [hasCJS, hasESM] = await Promise.all([
    fse.pathExists(cjsPath),
    fse.pathExists(esmPath),
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

        const packageJson = {
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
          delete (packageJson as any).module;
        }
        if (!mainEntryExists) {
          delete (packageJson as any).main;
        }
        if (!typingsEntryExist) {
          delete (packageJson as any).types;
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
      main: (await fse.pathExists(path.join(cjsPath, 'index.js')))
        ? `.${cjsDir ? `/${cjsDir}` : ''}/index.js`
        : './index.js',
      module: (await fse.pathExists(path.join(esmPath, 'index.js')))
        ? `.${esmDir ? `/${esmDir}` : ''}/index.js`
        : './index.js',
    };

    const [moduleEntryExists, mainEntryExists] = await Promise.all([
      fse.pathExists(path.resolve(output.dir, newPackageData.module)),
      fse.pathExists(path.resolve(output.dir, newPackageData.main)),
    ]);

    if (!moduleEntryExists) {
      delete newPackageData.module;
    }
    if (!mainEntryExists) {
      delete newPackageData.main;
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

  try {
    await sequential([
      ensureBuildDirExists(),
      typescriptCopy(),
      copyRequiredFiles(),
      parallel([createModulePackages(), createPackageFile()]),
      copyLibraryFiles(),
    ]);
    const buildTime = getBuildTime();
    log.done(
      `Build completed successfully in ${pc.bold(buildTime.toFixed(1))}s\n`,
    );
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

export default postbuild;
