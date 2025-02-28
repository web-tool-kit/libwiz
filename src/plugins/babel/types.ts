import type { TransformOptions } from '@babel/core';

export type BabelConfig = {
  presets: TransformOptions['presets'];
  plugins: TransformOptions['plugins'];
};
