import type { TransformOptions } from '@babel/core';
import { getConfig, type Config, type Bundles } from '../config';
import { magicImport } from '../utils';

const { babel: rootBabelConfig, ignore } = getConfig();

export type UseBabelConfigProps = {
  env?: Bundles;
  runtime?: boolean;
  version?: string;
};

function resolvePreset(rootBabelConfig: Config['babel'], env: Bundles) {
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
      runtime: 'classic',
    },
    '@babel/preset-typescript': {},
  };

  const presetMap = {};
  if (rootBabelConfig.presets?.length) {
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

  if (rootBabelConfig.browsers) {
    defaultPreset['@babel/preset-env'].targets = {
      browsers: rootBabelConfig.browsers as string[],
    };
  }

  if (rootBabelConfig.runtime) {
    defaultPreset['@babel/preset-react'].runtime = 'automatic';
  }

  const presets: TransformOptions['presets'] = [
    [magicImport('@babel/preset-env'), defaultPreset['@babel/preset-env']],
    [magicImport('@babel/preset-react'), defaultPreset['@babel/preset-react']],
    Boolean(Object.keys(defaultPreset['@babel/preset-typescript']).length)
      ? [magicImport('@babel/preset-typescript'), defaultPreset['@babel/preset-typescript']]
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

function resolvePlugins(rootBabelConfig: TransformOptions, env: Bundles) {
  const modern = env === 'modern';

  const defaultPlugins = {
    '@babel/plugin-transform-react-jsx': {},
    '@babel/plugin-transform-runtime': {
      version: '^7.25.4',
      useESModules: modern,
    },
  };
  const pluginsMap = {};
  if (rootBabelConfig.plugins?.length) {
    rootBabelConfig.plugins.map(plugin => {
      if (typeof plugin === 'string') {
        // if default plugin then skip as there is no
        // extra config mentioned
        if (!defaultPlugins[plugin]) {
          pluginsMap[plugin] = {};
        }
      } else if (Array.isArray(plugin)) {
        // here even if default plugin config, can be differ
        if (defaultPlugins[plugin[0]]) {
          defaultPlugins[plugin[0]] = plugin[1];
        } else {
          pluginsMap[plugin[0]] = plugin[1] || {};
        }
      }
    });
  }

  // overwrite `useESModules` as its can't be change by external config
  defaultPlugins['@babel/plugin-transform-runtime'].useESModules = modern;

  const plugins: TransformOptions['plugins'] = [
    Boolean(
      Object.keys(defaultPlugins['@babel/plugin-transform-react-jsx']).length,
    )
      ? [
        magicImport('@babel/plugin-transform-react-jsx').default,
        defaultPlugins['@babel/plugin-transform-react-jsx'],
      ]
      : magicImport('@babel/plugin-transform-react-jsx').default,
    [
      magicImport('@babel/plugin-transform-runtime'),
      defaultPlugins['@babel/plugin-transform-runtime'],
    ],
  ];

  Object.keys(pluginsMap).forEach(plugin => {
    if (Boolean(Object.keys(pluginsMap[plugin]).length)) {
      plugins.push([plugin, pluginsMap[plugin]]);
    } else {
      plugins.push(plugin);
    }
  });

  return plugins;
}

const useBabelConfig = ({ env }: UseBabelConfigProps) => {
  const babelConfig: TransformOptions = {
    ignore,
    comments: false,
  };

  if (rootBabelConfig) {
    if (rootBabelConfig.runtime) {
      babelConfig.ignore = [...babelConfig.ignore, /@babel[\\|/]runtime/];
    }
    babelConfig.presets = resolvePreset(rootBabelConfig, env);
    babelConfig.plugins = resolvePlugins(rootBabelConfig, env);
  }

  return babelConfig;
};

export default useBabelConfig;
