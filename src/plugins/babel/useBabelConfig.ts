import type { TransformOptions } from '@babel/core';
import { getBrowserslistConfig } from '../../config';
import { isPlainObject, ensureDependency } from '../../utils';
import type { Config } from '../../types';
import type { BabelConfig } from './types';

const useBabelConfig = (
  options: Pick<Config, 'root' | 'workspace'>,
  babelConfig?: BabelConfig,
) => {
  const plugins = babelConfig?.plugins || [];
  const presets = babelConfig?.presets || [];

  const { root, workspace } = options;

  const rootPresetConfigMap: Record<string, any> = {
    presetEnv: {},
  };

  let rootPresetConfig: BabelConfig['presets'] = [];

  if (presets?.length) {
    rootPresetConfig = presets.filter(preset => {
      if (Array.isArray(preset)) {
        if (isPlainObject(preset[1])) {
          if (preset[0] === '@babel/preset-env') {
            rootPresetConfigMap.presetEnv = preset[1];
            return;
          }
        }
      }
      return true;
    });
  }

  const babelPresetEnv = ensureDependency('@babel/preset-env', {
    root,
    workspace,
  });

  const browsersListConfig = getBrowserslistConfig(root || process.cwd());

  let browserTarget: any;
  if (browsersListConfig.env) {
    browserTarget = browsersListConfig.env;
  } else if (browsersListConfig.path) {
    process.env.BROWSERSLIST_CONFIG = browsersListConfig.path;
  } else if (browsersListConfig.packageJSON) {
    browserTarget = browsersListConfig.packageJSON;
  }

  const env: TransformOptions['env'] = {
    esm: {
      presets: [
        [
          babelPresetEnv,
          {
            ...rootPresetConfigMap.presetEnv,
            modules: false,
            shippedProposals: true,
            targets: {
              browsers: browserTarget,
            },
          },
        ],
      ],
    },
    cjs: {
      presets: [
        [
          babelPresetEnv,
          {
            ...rootPresetConfigMap.presetEnv,
            modules: 'commonjs',
            shippedProposals: true,
            targets: {
              browsers: browserTarget,
            },
          },
        ],
      ],
    },
  };

  return { presets: rootPresetConfig, plugins, env };
};

export default useBabelConfig;
