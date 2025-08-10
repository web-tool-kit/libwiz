import { getConfig } from '@/config';
import { magicImport, isPlainObject } from '@/utils';
import type {
  Bundles,
  CompilerConfig,
  PluginOptions,
  TransformOptions,
} from '@/types';

function isTSEnabled(extensions: string[] = []) {
  return Boolean(extensions.find(ext => /\.(tsx?|mts)$/.test(ext)));
}

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

function resolvePluginPresets(
  moduleId: string,
  options: PluginOptions,
  name?: string,
) {
  const { root, workspace } = getConfig();
  const pluginTarget = magicImport(moduleId, { root, workspace });

  // if we have options or name, return array format
  if (options !== undefined || name) {
    return [pluginTarget, options, name];
  }

  return pluginTarget;
}

const getDefaultBabelConfig = (target: Bundles): TransformOptions => {
  const { ignore, extensions } = getConfig();
  const compiler = getCompilerConfig(target);

  const rootPresetConfigMap: Record<string, any[]> = {
    presetEnv: [],
    presetTypescript: [],
  };

  let rootPresetConfig: CompilerConfig['presets'] = [];
  let isTypescriptPresetEnabled = isTSEnabled(extensions);

  if (Array.isArray(compiler?.presets)) {
    rootPresetConfig = compiler.presets.filter(preset => {
      if (preset === '@babel/preset-typescript') {
        isTypescriptPresetEnabled = true;
        return false;
      }

      // handle in case preset is array
      if (Array.isArray(preset)) {
        const [presetModuleName, presetOptions, presetCustomName] = preset;

        if (isPlainObject(presetOptions)) {
          if (presetModuleName === '@babel/preset-env') {
            rootPresetConfigMap.presetEnv = [presetOptions];
            return true;
          } else if (presetModuleName === '@babel/preset-typescript') {
            rootPresetConfigMap.presetTypescript = [
              presetOptions,
              presetCustomName,
            ];
            isTypescriptPresetEnabled = true;
            return false;
          }
        }
      }
      return true;
    });
  }

  const presets: TransformOptions['presets'] = [...rootPresetConfig];

  if (isTypescriptPresetEnabled) {
    const [tsPresetOptions, tsPresetCustomName] =
      rootPresetConfigMap.presetTypescript;
    presets.push(
      resolvePluginPresets(
        '@babel/preset-typescript',
        tsPresetOptions,
        tsPresetCustomName,
      ),
    );
  }

  const babelPresetEnv = {
    shippedProposals: true,
    ...rootPresetConfigMap.presetEnv[0],
  };

  if (compiler?.browsers) {
    babelPresetEnv.targets = {
      browsers: compiler?.browsers,
    };
  }

  const env: TransformOptions['env'] = {
    esm: {
      presets: [
        resolvePluginPresets('@babel/preset-env', {
          ...babelPresetEnv,
          modules: false,
        }),
      ],
    },
    cjs: {
      presets: [
        resolvePluginPresets('@babel/preset-env', {
          ...babelPresetEnv,
          modules: 'commonjs',
        }),
      ],
    },
  };

  const plugins = compiler?.plugins;
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
