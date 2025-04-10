import clone from 'clone-deep';
import { mergeDeep } from '../utils';
import { initConfig } from '../config';
import { compiler } from '../compiler';
import type { InternalConfig, Config, CliProps } from '../types';

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
  static #instance: CreateApi;
  #config: InternalConfig = {};

  get compiler() {
    return this.#config.__compiler || compiler;
  }

  static getInstance(): CreateApi {
    if (!CreateApi.#instance) {
      CreateApi.#instance = new CreateApi();
    }
    return CreateApi.#instance;
  }

  get config(): Config {
    return clone(this.#config);
  }

  async init(cliProps: CliProps) {
    const config: Config = {
      verbose: cliProps.verbose,
      srcPath: cliProps.srcDir,
      buildPath: cliProps.outDir,
      target: cliProps.target,
      lib: {
        esm: {
          output: {
            comments: true,
            sourceMap: cliProps.sourceMaps,
          },
        },
        cjs: {
          output: {
            comments: true,
            sourceMap: cliProps.sourceMaps,
          },
        },
      },
    };

    initCli();
    await initConfig(config);
  }

  setConfig(config: InternalConfig) {
    if (config.plugins) {
      config.plugins = config.plugins.filter(Boolean);
    }
    this.#config = mergeDeep(this.#config, config);
  }
}

export default CreateApi.getInstance();
