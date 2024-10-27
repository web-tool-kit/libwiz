import type { TransformOptions } from '@babel/core';
import { getConfig } from '../../config';
import { magicImport } from '../../utils';
import type { Bundles } from '../../types';

export type UseBabelConfigProps = {
  env?: Bundles;
};

function resolvePreset(env: Bundles) {
  const { babel: rootBabelConfig } = getConfig();

  const common = env === 'common';
  const modern = env === 'modern';

  const defaultPreset = {
    '@babel/preset-env': {
      bugfixes: true,
      modules: common ? 'commonjs' : false,
      shippedProposals: modern,
      targets: {
        browsers: [
          'last 2 Chrome versions',
          'last 2 Firefox versions',
          'last 2 Safari versions',
          'last 2 iOS versions',
          'last 1 Android version',
          'last 1 ChromeAndroid version',
          'ie 11',
        ],
      },
    },
    '@babel/preset-react': {
      runtime: 'automatic',
    },
    '@babel/preset-typescript': {},
  };

  defaultPreset['@babel/preset-react'].runtime =
    rootBabelConfig?.react?.runtime || 'automatic';

  const presetMap = {};
  if (rootBabelConfig?.presets?.length) {
    rootBabelConfig.presets.map(preset => {
      if (typeof preset === 'string') {
        // if default preset then skip as there is no
        // extra config mentioned
        if (!defaultPreset[preset]) {
          presetMap[preset] = {};
        }
      } else if (Array.isArray(preset)) {
        // here even if default preset, config can be differ
        if (defaultPreset[preset[0]]) {
          defaultPreset[preset[0]] = preset[1];
        } else {
          presetMap[preset[0]] = preset[1] || {};
        }
      }
    });
  }

  defaultPreset['@babel/preset-env'].modules = common ? 'commonjs' : false;
  defaultPreset['@babel/preset-env'].shippedProposals = modern;

  if (rootBabelConfig?.browsers) {
    defaultPreset['@babel/preset-env'].targets = {
      browsers: rootBabelConfig.browsers as string[],
    };
  }

  const presets: TransformOptions['presets'] = [
    [magicImport('@babel/preset-env'), defaultPreset['@babel/preset-env']],
    [magicImport('@babel/preset-react'), defaultPreset['@babel/preset-react']],
    Boolean(Object.keys(defaultPreset['@babel/preset-typescript']).length)
      ? [
          magicImport('@babel/preset-typescript'),
          defaultPreset['@babel/preset-typescript'],
        ]
      : magicImport('@babel/preset-typescript'),
  ];

  Object.keys(presetMap).forEach(plugin => {
    if (Boolean(Object.keys(presetMap[plugin]).length)) {
      presets.push([plugin, presetMap[plugin]]);
    } else {
      presets.push(plugin);
    }
  });

  return presets;
}

function resolvePlugins(env: Bundles) {
  const { babel: rootBabelConfig, ignore } = getConfig();
  let isRuntime = rootBabelConfig.runtime;

  const modern = env === 'modern';

  const defaultPlugins = {
    '@babel/plugin-transform-react-jsx': {},
    '@babel/plugin-transform-runtime': {
      version: '^7.25.4',
      useESModules: modern,
    },
  };

  const pluginsMap = {};
  if (rootBabelConfig?.plugins?.length) {
    rootBabelConfig.plugins.forEach(plugin => {
      if (typeof plugin === 'string') {
        // if default plugin then skip as there is no
        // extra config mentioned
        if (!defaultPlugins[plugin]) {
          pluginsMap[plugin] = {};
        }
      } else if (Array.isArray(plugin)) {
        const pluginName = plugin[0];
        const pluginConfig = plugin[1] || {};

        // here even if default plugin config, can be differ
        if (defaultPlugins[pluginName]) {
          defaultPlugins[pluginName] = {
            ...defaultPlugins[pluginName],
            ...pluginConfig,
          };
          if (pluginName === '@babel/plugin-transform-runtime') {
            isRuntime = true;
            defaultPlugins[pluginName].useESModules = modern;
          }
        } else {
          pluginsMap[pluginName] = pluginConfig;
        }
      }
    });
  }

  const plugins: TransformOptions['plugins'] = [
    Boolean(
      Object.keys(defaultPlugins['@babel/plugin-transform-react-jsx']).length,
    )
      ? [
          magicImport('@babel/plugin-transform-react-jsx').default,
          defaultPlugins['@babel/plugin-transform-react-jsx'],
        ]
      : magicImport('@babel/plugin-transform-react-jsx').default,
    // use transform runtime to optimize babel utils
    isRuntime && [
      magicImport('@babel/plugin-transform-runtime'),
      defaultPlugins['@babel/plugin-transform-runtime'],
    ],
  ].filter(Boolean);

  Object.keys(pluginsMap).forEach(plugin => {
    if (Boolean(Object.keys(pluginsMap[plugin]).length)) {
      plugins.push([plugin, pluginsMap[plugin]]);
    } else {
      plugins.push(plugin);
    }
  });

  const babelConfig: Pick<TransformOptions, 'ignore' | 'plugins'> = {
    ignore,
    plugins,
  };

  if (isRuntime !== false) {
    babelConfig.ignore = [...babelConfig.ignore, /@babel[\\|/]runtime/];
  }

  return babelConfig;
}

const useBabelConfig = ({ env }: UseBabelConfigProps) => {
  const { babel: rootBabelConfig, ignore } = getConfig();

  const babelConfig: TransformOptions = {
    ignore,
  };

  if (rootBabelConfig?.runtime !== false) {
    babelConfig.ignore = [...babelConfig.ignore, /@babel[\\|/]runtime/];
  }

  babelConfig.presets = resolvePreset(env);

  const pluginConfig = resolvePlugins(env);
  babelConfig.plugins = pluginConfig.plugins;
  babelConfig.ignore = pluginConfig.ignore;

  return babelConfig;
};

export default useBabelConfig;
