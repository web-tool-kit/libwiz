import path from 'node:path';
import glob from 'fast-glob';
import fse from 'fs-extra';
import ts from 'typescript';
import type { ParsedCommandLine } from 'typescript';
import pc from '../utils/picocolors';
import { log, clearLine, removeBuildInfoFiles } from '../utils';
import { getConfig } from '../config';

const host: ts.ParseConfigHost = {
  ...ts.sys,
  useCaseSensitiveFileNames: true,
};

const formatHost = {
  getCanonicalFileName: (path: string) => path,
  getCurrentDirectory: ts.sys.getCurrentDirectory,
  getNewLine: () => ts.sys.newLine,
};

function getParsedTSConfig() {
  const { tsConfig, ignore } = getConfig();
  const configDir = path.dirname(tsConfig);

  const resolvedConfig = ts.readConfigFile(tsConfig, ts.sys.readFile);
  if (resolvedConfig.error) {
    log.raw(
      ts.flattenDiagnosticMessageText(resolvedConfig.error.messageText, '\n'),
    );
    process.exit(1);
  }

  const parsed = ts.parseJsonConfigFileContent(
    resolvedConfig.config,
    host,
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

function compileDTS() {
  const { srcPath, buildPath } = getConfig();
  const config = getParsedTSConfig();

  const finalConfig: ParsedCommandLine = {
    ...config,
    options: {
      removeComments: false,
      ...config.options,
      composite: true,
      declaration: true,
      noEmit: false,
      emitDeclarationOnly: true,
      outDir: buildPath,
      rootDir: srcPath,
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
          diagnostic.start,
        );
        const filePath = path.relative(process.cwd(), diagnostic.file.fileName);
        const fileKey = `${filePath}${pc.gray(`:${line + 1}`)}`;
        fileErrorCount.set(fileKey, (fileErrorCount.get(fileKey) || 0) + 1);
      }
    });

    const totalErrors = allDiagnostics.length;
    const totalFiles = fileErrorCount.size;

    log.raw(
      ts.formatDiagnosticsWithColorAndContext(allDiagnostics, formatHost),
    );
    log.newline();

    log.raw(`\nFound ${totalErrors} errors in ${totalFiles} files.\n\n`);
    log.raw(`Errors  Files`);

    const detailFileErrorArr = [];
    fileErrorCount.forEach((count, fileKey) => {
      detailFileErrorArr.push(`${count.toString().padStart(6)}  ${fileKey}`);
    });
    log.raw(detailFileErrorArr.join('\n'));
    process.exit(1);
  }
}

async function types() {
  log.progress('Generating types...');
  const { root, tsConfig, buildPath } = getConfig();

  if (!fse.existsSync(tsConfig)) {
    let packageJsonFile: string | null = path.resolve(root, 'package.json');

    if (!fse.existsSync(packageJsonFile)) {
      packageJsonFile = null;
    }

    const packageJson = packageJsonFile
      ? JSON.parse(fse.readFileSync(packageJsonFile, { encoding: 'utf8' }))
      : { name: root };

    console.error(
      `The package root needs to contain a 'tsconfig.build.json' or 'tsconfig.json'. ` +
        `The package is '${packageJson.name}'`,
    );
    process.exit(1);
  }

  compileDTS();

  const declarationFiles = await glob('**/*.d.ts', {
    absolute: true,
    cwd: buildPath,
  });

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
      } catch (error) {
        console.error(error);
        process.exit(1);
      }
    }),
  );

  await removeBuildInfoFiles(root);
  clearLine();
}

export default types;
