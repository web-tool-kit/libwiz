import type { Bundles } from './config';

export type CliTaskTypes = 'init' | 'build' | 'dev' | 'types';

export interface CliOptions {
  types: boolean;
  check: boolean;
  srcDir: string;
  outDir: string;
  bundle: string;
  progress: boolean;
  target: Bundles;
  sourceMaps: boolean;
  quiet: boolean;
}
