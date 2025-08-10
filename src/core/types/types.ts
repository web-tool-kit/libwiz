import path from 'node:path';
import glob from 'fast-glob';
import fse from 'fs-extra';
import pc from '@/utils/picocolors';
import { log, clearLine, removeBuildInfoFiles, createTimer } from '@/utils';
import { getConfig } from '@/config';
import { getTypescript, TS } from '@/typescript';
import type { ParsedCommandLine, ParseConfigHost } from '@/typescript';
import { postProcessDTS, getFormatHost } from './utils';

function getParsedTSConfig() {
  const ts = getTypescript() as TS;
  const { tsConfig, ignore } = getConfig();
  const configDir = path.dirname(tsConfig);

  const resolvedConfig = ts.readConfigFile(tsConfig, ts.sys.readFile);
  if (resolvedConfig.error) {
    log.raw(
      ts.flattenDiagnosticMessageText(resolvedConfig.error.messageText, '\n'),
    );
    process.exit(1);
  }

  const tsHost: ParseConfigHost = {
    ...ts.sys,
    useCaseSensitiveFileNames: true,
  };

  const parsed = ts.parseJsonConfigFileContent(
    resolvedConfig.config,
    tsHost,
    configDir,
    undefined,
    tsConfig,
  );

  if (parsed.errors.length > 0) {
    log.raw(
      parsed.errors
        .map(e => ts.flattenDiagnosticMessageText(e.messageText, '\n'))
        .join('\n'),
    );
    process.exit(1);
  }

  const allowJs = parsed.options.allowJs ?? false;
  const includePatterns = parsed.raw?.include ?? [
    '**/*.ts',
    '**/*.tsx',
    '**/*.d.ts',
    ...(allowJs ? ['**/*.js', '**/*.jsx'] : []),
  ];

  const excludePatterns =
    Array.isArray(parsed.raw?.exclude) && parsed.raw.exclude.length > 0
      ? parsed.raw.exclude
      : ['node_modules', 'bower_components', 'jspm_packages', ...ignore];

  // resolve glob patterns, default ts does not support glob patterns
  const fileNames = glob.sync(includePatterns, {
    cwd: configDir,
    ignore: excludePatterns,
    absolute: true,
  });

  parsed.fileNames = fileNames;
  return parsed;
}

async function compileDTS(onlyTypeCheck = false) {
  const { srcPath, output, lib } = getConfig();
  const ts = getTypescript() as TS;
  const config = getParsedTSConfig();

  const esmDistPath = lib?.esm?.output?.path as string;
  const cjsDistPath = lib?.cjs?.output?.path as string;

  let outDir = output.dir;
  if (await fse.pathExists(esmDistPath)) {
    outDir = esmDistPath;
  } else if (await fse.pathExists(cjsDistPath)) {
    outDir = cjsDistPath;
  }

  const finalConfig: ParsedCommandLine = {
    ...config,
    options: {
      removeComments: false,
      ...config.options,
      declaration: true,
      noEmit: onlyTypeCheck,
      emitDeclarationOnly: true,
      rootDir: srcPath,
      outDir: onlyTypeCheck ? undefined : outDir,
    },
  };

  const program = ts.createProgram({
    rootNames: finalConfig.fileNames,
    options: finalConfig.options,
    projectReferences: finalConfig.projectReferences,
  });

  const emitResult = program.emit();

  const allDiagnostics = ts
    .getPreEmitDiagnostics(program)
    .concat(emitResult.diagnostics);

  if (allDiagnostics.length > 0) {
    clearLine();
    log.error(
      'Build process halted due to type errors. Please address the issues listed below to proceed with the build.',
    );
    log.newline();
    log.newline();

    const fileErrorCount = new Map();

    allDiagnostics.forEach(diagnostic => {
      if (diagnostic.file) {
        const { line } = diagnostic.file.getLineAndCharacterOfPosition(
          diagnostic.start as number,
        );
        const filePath = path.relative(process.cwd(), diagnostic.file.fileName);
        const fileKey = `${filePath}${pc.gray(`:${line + 1}`)}`;
        fileErrorCount.set(fileKey, (fileErrorCount.get(fileKey) || 0) + 1);
      }
    });

    const totalErrors = allDiagnostics.length;
    const totalFiles = fileErrorCount.size;

    log.raw(
      ts.formatDiagnosticsWithColorAndContext(allDiagnostics, getFormatHost()),
    );
    log.newline();

    log.raw(`\nFound ${totalErrors} errors in ${totalFiles} files.\n\n`);
    log.raw(`Errors  Files`);

    const detailFileErrorArr: string[] = [];
    fileErrorCount.forEach((count, fileKey) => {
      detailFileErrorArr.push(`${count.toString().padStart(6)}  ${fileKey}`);
    });
    log.raw(detailFileErrorArr.join('\n'));
    process.exit(1);
  }

  return emitResult;
}

// this function is used to generate types
async function types(onlyTypeCheck = false, showTiming = true) {
  const getTime = createTimer();

  log.info(onlyTypeCheck ? 'Type checking...' : 'Generating types...');
  const { root, tsConfig, output } = getConfig();

  if (!(await fse.pathExists(tsConfig))) {
    let packageJsonFile: string | null = path.resolve(root, 'package.json');

    if (!(await fse.pathExists(packageJsonFile))) {
      packageJsonFile = null;
    }

    const packageJson = packageJsonFile
      ? JSON.parse(await fse.readFile(packageJsonFile, { encoding: 'utf8' }))
      : { name: root };

    console.error(
      `The package root needs to contain a 'tsconfig.build.json' or 'tsconfig.json'. ` +
        `The package is '${packageJson.name}'`,
    );
    process.exit(1);
  }

  await compileDTS(onlyTypeCheck);

  if (!onlyTypeCheck) {
    // in case of type generation, remove unwanted imports from .d.ts files
    // like .css, .png etc
    await postProcessDTS(output.dir);
  }

  await removeBuildInfoFiles(root);
  clearLine();

  if (showTiming) {
    const finishedTime = getTime();
    if (onlyTypeCheck) {
      log.done(
        `Type check completed successfully in ${pc.bold(finishedTime.toFixed(1))}s`,
      );
    } else {
      log.done(
        `Types generated successfully in ${pc.bold(finishedTime.toFixed(1))}s`,
      );
    }
  }
}

export default types;
