import clone from 'clone-deep';
import { mergeDeep } from '../utils';
import { initConfig } from '../config';
import type { Config, CliProps } from '../types';

function initCli() {
  if (!process.stdout.isTTY) return;
  process.stdout.write('\u001B[?25l');

  function restoreCursor() {
    process.stdout.write('\u001B[?25h');
    process.exit(0);
  }

  ['SIGINT', 'SIGTERM', 'exit'].map(event => {
    process.on(event, restoreCursor);
  });
}

class CreateApi {
  private static instance: CreateApi;
  private config: Config;

  private constructor() {
    this.config = {};
  }

  static getInstance(): CreateApi {
    if (!CreateApi.instance) {
      CreateApi.instance = new CreateApi();
    }
    return CreateApi.instance;
  }

  init(cliProps: CliProps) {
    const config: Config = {
      debug: cliProps.verbose,
      srcPath: cliProps.srcDir,
      buildPath: cliProps.outDir,
      target: cliProps.target,
      lib: {
        esm: {
          output: {
            comments: true,
            sourceMap: Boolean(cliProps.sourceMaps),
          },
        },
        cjs: {
          output: {
            comments: true,
            sourceMap: Boolean(cliProps.sourceMaps),
          },
        },
      },
    };

    initCli();
    initConfig(config);
  }

  setConfig(newConfig: Config): Config {
    this.config = mergeDeep(this.config, newConfig);
    return this.config;
  }

  getConfig(): Config {
    return clone(this.config);
  }
}

export default CreateApi.getInstance();
