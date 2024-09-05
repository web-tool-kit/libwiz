import type { Bundles } from '../config';

export type { Bundles, ModuleConfig, LibConfig, Config } from '../config';

export interface BuildProps {
  sourceMaps: boolean;
  outDir: string;
  target: Bundles;
}

export interface WatchProps extends BuildProps {
  copy?: boolean;
}

export interface CliProps extends BuildProps {
  build: boolean;
  types: boolean;
  watch: boolean;
  prebuild: boolean;
  sourceMaps: boolean;
  outDir: string;
  bundle: string;
  verbose: boolean;
}
