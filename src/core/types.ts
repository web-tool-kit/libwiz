import path from 'node:path';
import glob from 'fast-glob';
import fse from 'fs-extra';
import ts, { ParsedCommandLine } from 'typescript';
import { log, clearLine, removeBuildInfoFiles } from '../utils';
import { getConfig } from '../config';

function getParsedTSConfig() {
  const { tsConfig } = getConfig();
  const configFileText = fse.readFileSync(tsConfig, 'utf8');
  const result = ts.parseConfigFileTextToJson(tsConfig, configFileText);

  if (result.error) {
    console.error(
      ts.flattenDiagnosticMessageText(result.error.messageText, '\n'),
    );
    process.exit(1);
  }

  const clientConfig = ts.parseJsonConfigFileContent(
    result.config,
    ts.sys,
    path.dirname(tsConfig),
    undefined,
    tsConfig,
  );

  if (clientConfig.errors.length > 0) {
    console.error(
      clientConfig.errors
        .map(e => ts.flattenDiagnosticMessageText(e.messageText, '\n'))
        .join('\n'),
    );
    process.exit(1);
  }

  return clientConfig;
}

function compileDTS() {
  const { srcPath, buildPath } = getConfig();
  const config = getParsedTSConfig();

  const finalConfig: ParsedCommandLine = {
    ...config,
    options: {
      ...config.options,
      composite: true,
      declaration: true,
      noEmit: false,
      emitDeclarationOnly: true,
      outDir: buildPath,
      rootDir: srcPath,
      removeComments: false,
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
    allDiagnostics.forEach(diagnostic => {
      if (diagnostic.file) {
        const { line, character } =
          diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
        const message = ts.flattenDiagnosticMessageText(
          diagnostic.messageText,
          '\n',
        );
        console.error(
          `${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`,
        );
      } else {
        const message = ts.flattenDiagnosticMessageText(
          diagnostic.messageText,
          '\n',
        );
        console.error(message);
      }
    });
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
