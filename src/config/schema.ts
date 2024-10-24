import pc from 'picocolors';
import { TransformOptions } from '@babel/core';
import { z } from 'zod';
import { log } from '../utils';

export type Bundles = 'modern' | 'common';

export interface ModuleConfig {
  output?: {
    comments?: boolean;
    sourceMap?: boolean;
  };
}

export interface LibConfig {
  esm?: ModuleConfig;
  cjs?: ModuleConfig;
}

export type Config = Partial<{
  debug: boolean;
  root: string;
  srcPath: string;
  buildPath: string;
  workspace: string;
  tsConfig: string;
  extensions: string[];
  ignore: string[];
  lib: LibConfig;
  target: Bundles | Bundles[];
  babel: Partial<{
    runtime: boolean;
    react: {
      runtime: 'classic' | 'automatic';
    };
    presets: TransformOptions['presets'];
    plugins: TransformOptions['plugins'];
    browsers: string | string[];
  }>;
  assets: string | string[] | null;
}>;

const VALID_BUNDLE_ENUM = z
  .enum(['modern', 'common'])
  .describe('Valid bundle types');

export const ModuleConfigSchema = z
  .object({
    output: z
      .object({
        comments: z
          .boolean()
          .optional()
          .describe('Include comments in the output'),
        sourceMap: z.boolean().optional().describe('Generate source maps'),
      })
      .optional()
      .describe('Output configuration'),
  })
  .strict()
  .optional()
  .describe('Module configuration');

export const LibConfigSchema = z
  .object({
    esm: ModuleConfigSchema.describe('ESM module configuration'),
    cjs: ModuleConfigSchema.describe('CommonJS module configuration'),
  })
  .strict()
  .optional()
  .describe('Library configuration');

const BabelOverrideSchema = z
  .object({
    exclude: z
      .instanceof(RegExp)
      .describe('Regular expression to exclude files'),
    plugins: z.array(z.string()).describe('Array of Babel plugins'),
  })
  .strict()
  .describe('Babel override configuration');

const PluginAndPresetSchema = z.union([
  z.string().describe('Plugin or preset name'),
  z
    .tuple([z.string(), z.record(z.any())])
    .describe('Plugin or preset with options'),
]);

const BabelConfigSchema = z
  .object({
    runtime: z.boolean().optional().describe('Use Babel runtime'),
    react: z
      .object({
        runtime: z
          .enum(['classic', 'automatic'])
          .describe('React runtime mode'),
      })
      .optional()
      .describe('React configuration'),
    presets: z
      .array(PluginAndPresetSchema)
      .optional()
      .describe('Babel presets'),
    plugins: z
      .array(PluginAndPresetSchema)
      .optional()
      .describe('Babel plugins'),
    browsers: z
      .union([z.string(), z.array(z.string())])
      .optional()
      .describe('Target browsers'),
    overrides: z
      .array(BabelOverrideSchema)
      .optional()
      .describe('Babel overrides'),
  })
  .strict();

export const ConfigSchema = z
  .object({
    debug: z.boolean().optional().describe('Enable debug mode'),
    root: z.string().optional().describe('Root directory'),
    workspace: z.string().optional().describe('Workspace directory'),
    srcPath: z.string().optional().describe('Source path'),
    buildPath: z.string().optional().describe('Build output path'),
    tsConfig: z
      .string()
      .optional()
      .describe('TypeScript configuration file path'),
    extensions: z
      .array(z.string())
      .optional()
      .describe('File extensions to process'),
    ignore: z.array(z.string()).optional().describe('Patterns to ignore'),
    lib: LibConfigSchema,
    target: z
      .union([VALID_BUNDLE_ENUM, z.array(VALID_BUNDLE_ENUM)])
      .optional()
      .describe('Build targets'),
    babel: BabelConfigSchema.optional(),
    assets: z
      .union([z.string(), z.array(z.string()), z.null()])
      .optional()
      .describe('Assets to include'),
  })
  .strict();

function formatZodErrors(errors: any[]) {
  const error = errors[0];
  const { path, message } = error;
  const pathString = `${pc.yellow(path.length ? path.join(' -> ') : 'root')}`;
  const stackTrace = new Error().stack;
  const filteredStackTrace = stackTrace
    .split('\n')
    .filter(line => line.includes('/'))
    .join('\n');
  return `Error in config ${pathString} : ${message} \n${filteredStackTrace}`;
}

export function validateConfigSchema(config: Config) {
  const configResult = ConfigSchema.safeParse(config);
  if (!configResult.success) {
    log.error(formatZodErrors(configResult.error.errors));
    process.exit(1);
  }
  return configResult.data as Config;
}
