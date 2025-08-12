import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import type { CliOptions, CliTaskTypes } from '@/types';

function getPackageVersion() {
  try {
    const packageJsonPath = resolve(__dirname, '../package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    return packageJson.version as string;
  } catch {}
}

export function parseArgs() {
  const version = getPackageVersion() as string;

  const argv = yargs(hideBin(process.argv))
    .help()
    .strict()
    .parserConfiguration({
      'boolean-negation': false,
    })

    // target will be used if you want to generate build for
    // specific case like cjs or esm
    .option('target', { type: 'string' })

    // source dir, default it will be src
    .option('src-dir', { default: './src', type: 'string' })

    // output dir, default it will be dist it could be
    // build or something else based on need
    .option('out-dir', { default: './dist', type: 'string' })

    // this flag will required if we need to generate type
    // definition files *.d.ts
    .option('types', {
      default: false,
      describe: 'To generate types definitions',
      type: 'boolean',
    })

    .option('source-maps', {
      default: false,
      alias: 'sourceMaps',
      describe: 'To create source map of library',
      type: 'boolean',
    })

    .option('progress', {
      type: 'boolean',
      default: undefined,
      description: 'Enable progress bar',
    })

    .option('check', {
      type: 'boolean',
      default: false,
      description:
        'Type check only without generating files (types command only)',
    })
    .help()
    .strict()
    .version(version || 'unknown')
    .demandCommand(
      1,
      1,
      'Please specify the command: `init`, `build`, `dev`, or `types` (eg: libwiz build)',
    )
    .parse();

  const task = (argv as any)['_'][0] as CliTaskTypes;

  // in case task is not valid of exist then throw error
  if (!['init', 'build', 'dev', 'types'].includes(task)) {
    console.error(
      'Please specify the correct command: `init`, `build`, `dev`, or `types` (eg: libwiz build)',
    );
    process.exit(1);
  }

  const cliOptions = argv as unknown as CliOptions;

  if (cliOptions.progress === true) {
    process.env.LIBWIZ_ENABLE_PROGRESS = 'true';
  }

  return { cliOptions, task, version };
}
