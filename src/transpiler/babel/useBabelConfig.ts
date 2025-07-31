import type { TransformOptions } from '@babel/core';
import { getConfig } from '@/config';
import { magicImport, isPlainObject } from '@/utils';
import type { Bundles, CompilerConfig } from '@/types';

// keep compiler config in cache to prevent re-computation
const compilerConfigCache = new Map<Bundles, CompilerConfig>();
function getCompilerConfig(target: Bundles) {
  if (compilerConfigCache.has(target)) {
    return compilerConfigCache.get(target);
  }
  const { compiler } = getConfig();
  const isESM = target === 'esm';
  const isCJS = target === 'cjs';

  const compilerConfig =
    typeof compiler === 'function'
      ? compiler({ target, isESM, isCJS })
      : compiler;
  compilerConfigCache.set(target, compilerConfig);
  return compilerConfig;
}

function resolvePluginPresets(moduleId: string, options = {}) {
  const { root, workspace } = getConfig();
  if (options && Object.keys(options).length) {
    return [magicImport(moduleId, { root, workspace }), { ...options }];
  }
  return magicImport(moduleId, { root, workspace });
}

const getPluginConfig = (target: Bundles) => {
  const compiler = getCompilerConfig(target);

  const rootPluginConfigMap: Record<string, any> = {
    pluginTransformReactJSX: {},
  };

  let rootPluginConfig = [];
  if (compiler?.plugins?.length) {
    rootPluginConfig = compiler.plugins.filter(plugin => {
      if (Array.isArray(plugin)) {
        if (isPlainObject(plugin[1])) {
          if (plugin[0] === '@babel/plugin-transform-react-jsx') {
            rootPluginConfigMap.pluginTransformReactJSX = plugin[1];
            return;
          }
        }
      }
      return true;
    });
  }

  return [
    resolvePluginPresets('@babel/plugin-transform-react-jsx', {
      ...compiler.react,
      ...rootPluginConfigMap.pluginTransformReactJSX,
    }),
    ...rootPluginConfig,
  ];
};

const getDefaultBabelConfig = (target: Bundles): TransformOptions => {
  const { ignore, root, workspace } = getConfig();
  const compiler = getCompilerConfig(target);

  const rootPresetConfigMap: Record<string, any> = {
    presetEnv: {},
    presetReact: {},
    presetTypescript: {},
  };

  let rootPresetConfig = [];
  if (compiler?.presets?.length) {
    rootPresetConfig = compiler.presets.filter(preset => {
      if (Array.isArray(preset)) {
        if (isPlainObject(preset[1])) {
          if (preset[0] === '@babel/preset-env') {
            rootPresetConfigMap.presetEnv = preset[1];
            return;
          } else if (preset[0] === '@babel/preset-react') {
            rootPresetConfigMap.presetReact = preset[1];
            return;
          } else if (preset[0] === '@babel/preset-typescript') {
            rootPresetConfigMap.presetTypescript = preset[1];
            return;
          }
        }
      }
      return true;
    });
  }

  const presets: TransformOptions['presets'] = [
    ...rootPresetConfig,
    resolvePluginPresets(
      '@babel/preset-typescript',
      rootPresetConfigMap.presetTypescript,
    ),
    resolvePluginPresets('@babel/preset-react', {
      ...rootPresetConfigMap.presetReact,
      runtime: compiler?.react?.runtime || 'automatic',
    }),
  ];

  const env: TransformOptions['env'] = {
    esm: {
      presets: [
        [
          magicImport('@babel/preset-env', { root, workspace }),
          {
            ...rootPresetConfigMap.presetEnv,
            modules: false,
            shippedProposals: true,
            targets: {
              browsers: compiler?.browsers,
            },
          },
        ],
      ],
    },
    cjs: {
      presets: [
        [
          magicImport('@babel/preset-env', { root, workspace }),
          {
            ...rootPresetConfigMap.presetEnv,
            modules: 'commonjs',
            shippedProposals: true,
            targets: {
              browsers: compiler?.browsers,
            },
          },
        ],
      ],
    },
  };

  const plugins = getPluginConfig(target);
  const overrides = compiler?.overrides;
  return { presets, plugins, ignore, env, overrides };
};

const configCache = new Map<Bundles, TransformOptions>();

const useBabelConfig = (target: Bundles) => {
  // return in case of cache hit to prevent re-computation
  if (configCache.has(target)) return configCache.get(target);

  const babelConfig = getDefaultBabelConfig(target);
  configCache.set(target, babelConfig);
  return babelConfig;
};

export default useBabelConfig;
