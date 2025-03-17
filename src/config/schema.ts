import pc from 'picocolors';
import { z } from 'zod';
import { log } from '../utils';
import type { Config } from '../types';

const VALID_BUNDLE_ENUM = z.enum(['esm', 'cjs']).describe('Valid bundle types');

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

const LibwizReactConfigSchema = z
  .object({
    pragma: z.string().optional().describe('React pragma for JSX'),
    pragmaFrag: z.string().optional().describe('React pragma for fragment'),
    throwIfNamespace: z
      .boolean()
      .optional()
      .describe('Throw if namespace is used in JSX'),
    useBuiltins: z
      .boolean()
      .optional()
      .describe('Enable built-in runtime optimizations'),
    development: z
      .boolean()
      .optional()
      .describe('Used to build in development mode, default its `false`'),
    runtime: z
      .enum(['classic', 'automatic'])
      .optional()
      .describe('React runtime mode'),
    importSource: z.string().optional().describe('React import source'),
  })
  .optional()
  .describe('React config for transpile');

const PluginAndPresetSchema = z.union([
  z.string().describe('Plugin or preset name'),
  z
    .tuple([z.string(), z.record(z.any())])
    .describe('Plugin or preset with options'),
]);

const CompilerSchema = z
  .object({
    tool: z.enum(['babel']).optional().describe('Compiler tool'),
    react: LibwizReactConfigSchema.optional().describe(
      'React specific configuration',
    ),
    presets: z
      .array(PluginAndPresetSchema)
      .optional()
      .describe('Compiler presets'),
    plugins: z
      .array(PluginAndPresetSchema)
      .optional()
      .describe('Compiler plugins'),
    browsers: z
      .union([z.string(), z.array(z.string())])
      .optional()
      .describe('Target browsers for compilation'),
  })
  .strict();

const CustomTranspileOptionsSchema = z.object({
  env: VALID_BUNDLE_ENUM,
  sourceMaps: z.boolean(),
  comments: z.boolean(),
});

const CustomTranspileOutputSchema = z.object({
  code: z.string(),
  map: z.string().optional(),
});

const SwcConfigSchema = z.record(z.any()).describe('SWC configuration');
const ToolsSchema = z
  .object({
    swc: SwcConfigSchema.optional(),
    babel: CompilerSchema.optional().describe('Compiler configuration'),
  })
  .optional()
  .describe('Tools configuration');

export const ConfigSchema = z
  .object({
    mode: z
      .enum(['development', 'production'])
      .optional()
      .describe('Build mode'),
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
    assets: z
      .union([z.string(), z.array(z.string()), z.null()])
      .optional()
      .describe('Assets to include'),
    customTranspiler: z
      .function()
      .args(z.string(), CustomTranspileOptionsSchema)
      .returns(z.promise(z.union([CustomTranspileOutputSchema, z.void()])))
      .optional()
      .describe('Custom transpile function'),
    plugins: z.array(z.any()).optional().describe('Libwiz plugins'),
    tools: ToolsSchema,
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
