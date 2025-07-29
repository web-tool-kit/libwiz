# libwiz

<p>
  <a href="https://npmjs.com/package/libwiz?activeTab=readme"><img src="https://img.shields.io/npm/v/libwiz?style=flat-square&colorA=000000&colorB=8338EC" alt="npm version" /></a>
  <a href="https://nodejs.org/en/about/previous-releases"><img src="https://img.shields.io/node/v/libwiz.svg?style=flat-square&colorA=000000&colorB=8338EC" alt="node version"></a>
  <a href="https://github.com/ui-tool-kit/libwiz/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square&colorA=000000&colorB=8338EC" alt="license" /></a>
</p>

`libwiz` is a powerful CLI tool designed to help you build JavaScript and TypeScript libraries, especially for React components. It supports output formats like ESM (ECMAScript Module) and CJS (CommonJS), while offering features like type generation, source maps, and more.

## Features

- 📦 **Multi-format Support**: Build libraries in ESM (modern JavaScript) or CJS (CommonJS) formats.
- 📜 **TypeScript Type Generation**: Automatically generate TypeScript definition files (`*.d.ts`).
- 🛠 **Customizable Build Directories**: Specify source and output directories as needed.
- 🔄 **Dev Mode**: Automatically rebuild when files change.
- 🗺 **Source Maps**: Generate source maps for easier debugging.
- ⚙️ **Config File Support**: Customize the build with a configuration file (`libwiz.config.js`, `libwiz.config.json`, or `.libwizrc`).

## Installation

```bash
# Install globally
npm install -g libwiz

# Or add as dev dependency
npm install --save-dev libwiz
```

## Usage

### Commands

`libwiz` provides two primary commands: `build` and `dev`.

1. **build**: Build the library in the desired format.
2. **dev**: Run the build in watch mode for faster development.

### Basic Usage

```bash
# Build library
libwiz build

# Build with TypeScript types
libwiz build --types

# Watch mode for development
libwiz dev
```

### Options

| Option          | Description                                      | Default  |
| --------------- | ------------------------------------------------ | -------- |
| `--target`      | Build target format(s): `esm`, `cjs`, or both.   | both     |
| `--src-dir`     | Source directory for your library code.          | `./src`  |
| `--out-dir`     | Output directory for build files.                | `./dist` |
| `--types`       | Generate TypeScript definition files (`*.d.ts`). | false    |
| `--source-maps` | Generate source maps for the build.              | false    |
| `--progress`    | Enable progress bar during build.                | false    |
| `--help`        | Show help for all commands and options.          |          |
| `--version`     | Show the installed version of `libwiz`.          |          |

### Configuration

`libwiz` also supports configuration files to give you more control over your build process. You can create a config file named `libwiz.config.js`, `libwiz.config.json`, or `.libwizrc` in your project root. Here's an overview of the configuration options available:

#### Config Schema Overview

The following configuration options allow you to customize or override the default flow. By default, `libwiz` will use sensible values, but you can specify these options as needed to fine-tune the build process.

- **`root`** (`string`): Specifies the root directory of the project.
- **`workspace`** (`string`): Defines a workspace directory within the project.
- **`srcPath`** (`string`): Path to the source files of the library.
- **`buildPath`** (`string`): Directory where build output files will be stored.
- **`tsConfig`** (`string`): Path to the TypeScript configuration file, such as `tsconfig.json`.
- **`extensions`** (`array of strings`): List of file extensions to process, e.g., `['.ts', '.tsx']`.
- **`ignore`** (`array of strings`): Glob patterns to ignore during build (e.g., `**/__tests__/**`, `**/*.test.ts`, `**/fixtures/**`). Useful for excluding test files, fixtures, and other non-production code.
- **`lib`** (`object`): Library configuration settings for both ESM and CJS builds:
  - **`esm`** (`object`): Settings for ESM (EcmaScript Module) format output.
    - **`output`** (`object`): Configures ESM output settings.
      - **`comments`** (`boolean`): Includes comments in the output if `true`.
      - **`sourceMap`** (`boolean`): Generates source maps if `true`.
  - **`cjs`** (`object`): Settings for CJS (CommonJS) format output.
    - **`output`** (`object`): Configures CJS output settings.
      - **`comments`** (`boolean`): Includes comments in the output if `true`.
      - **`sourceMap`** (`boolean`): Generates source maps if `true`.
- **`target`** (`string` or `array`): Specifies build targets, such as `"esm"`, `"cjs"`, or an array with both.
- **`customTranspiler`** (`function`): A custom function to handle transpilation if specific control is required.
- **`compiler`** (`object` or `function`, optional): Advanced compiler configuration that can be either a static object or a dynamic function based on build target.
  - **As Object**: Static compiler configuration applied to all targets.
    - **`react`** (`object`): React-specific configuration options.
      - **`pragma`** (`string`): Specifies the React pragma for JSX transformation.
      - **`pragmaFrag`** (`string`): Specifies the React pragma for fragments.
      - **`throwIfNamespace`** (`boolean`): Throws an error if a namespace is used in JSX if `true`.
      - **`useBuiltins`** (`boolean`): Enables runtime optimizations if `true`.
      - **`runtime`** (`string`): Sets React runtime mode; can be `"classic"` or `"automatic"`.
      - **`importSource`** (`string`): Specifies the source library for JSX imports, useful for custom JSX setups.
    - **`presets`** (`array`): Array of compiler presets; can be either `string` or `[string, object]` for custom options.
    - **`plugins`** (`array`): Array of compiler plugins; can be either `string` or `[string, object]` for custom options.
    - **`browsers`** (`string` or `array`): Target browsers for code compilation.
    - **`overrides`** (`array`): Babel overrides configuration for conditional compilation based on file patterns or other criteria.
  - **As Function**: Dynamic compiler configuration that receives build context and returns compiler options.
    - **Function Signature**: `(context: CompilerContext) => CompilerConfig`
    - **Context Object**:
      - **`target`** (`'esm' | 'cjs'`): Current build target
      - **`isESM`** (`boolean`): Whether building for ESM format
      - **`isCJS`** (`boolean`): Whether building for CommonJS format
    - **Returns**: Same `CompilerConfig` object as above
- **`assets`** (`string`, `array`, or `null`): Specifies additional assets to include in the build, like `['**/*.css']`. Set to `null` to exclude assets.

### Example Configuration

Here is an example of a configuration file (`libwiz.config.js`):

```js
// libwiz.config.js
module.exports = {
  root: './',
  workspace: '../../',
  srcPath: './src',
  buildPath: './dist',
  tsConfig: './tsconfig.json',
  extensions: ['.ts', '.tsx'],
  ignore: ['**/__tests__/**'],
  lib: {
    esm: {
      output: {
        comments: true,
        sourceMap: true,
      },
    },
    cjs: {
      output: {
        comments: true,
        sourceMap: true,
      },
    },
  },
  target: ['esm', 'cjs'],
  compiler: {
    react: {
      runtime: 'automatic',
    },
    presets: [
      // ...any presets if exist
    ],
    plugins: [
      '@babel/plugin-proposal-object-rest-spread',
      '@babel/plugin-proposal-class-properties',
    ],
    browsers: 'last 2 versions',
  },
  assets: '**/*.css',
};
```

### Advanced Compiler Configuration Examples

#### Static Compiler Configuration (Object)

```js
// libwiz.config.js
module.exports = {
  // ... other config
  compiler: {
    react: {
      runtime: 'automatic',
      importSource: '@emotion/react',
    },
    presets: [
      '@babel/preset-env',
      ['@babel/preset-react', { runtime: 'automatic' }],
    ],
    plugins: [
      '@babel/plugin-proposal-class-properties',
      '@babel/plugin-proposal-object-rest-spread',
    ],
    browsers: ['last 2 versions', 'not dead'],
  },
};
```

#### Dynamic Compiler Configuration (Function)

```js
// libwiz.config.js
module.exports = {
  // ... other config
  compiler: context => {
    const { isESM, isCJS } = context;

    // Different configuration for ESM vs CJS
    if (isESM) {
      return {
        react: {
          runtime: 'automatic',
          importSource: '@emotion/react',
        },
        presets: [
          ['@babel/preset-env', { modules: false }],
          '@babel/preset-react',
        ],
        plugins: [
          '@babel/plugin-proposal-class-properties',
          '@babel/plugin-transform-runtime',
        ],
        browsers: ['last 2 versions'],
      };
    }

    // CommonJS configuration
    if (isCJS) {
      return {
        react: {
          runtime: 'classic',
        },
        presets: [
          ['@babel/preset-env', { modules: 'commonjs' }],
          '@babel/preset-react',
        ],
        plugins: ['@babel/plugin-proposal-class-properties'],
        browsers: ['ie 11', 'last 2 versions'],
      };
    }

    // Fallback configuration
    return {
      react: { runtime: 'automatic' },
      presets: ['@babel/preset-env', '@babel/preset-react'],
      browsers: 'last 2 versions',
    };
  },
};
```

#### Conditional Plugin Loading

```js
// libwiz.config.js
module.exports = {
  // ... other config
  compiler: ({ isESM }) => {
    const baseConfig = {
      react: { runtime: 'automatic' },
      presets: ['@babel/preset-env', '@babel/preset-react'],
    };

    // Add tree-shaking optimizations for ESM
    if (isESM) {
      return {
        ...baseConfig,
        plugins: [
          '@babel/plugin-transform-runtime',
          '@babel/plugin-proposal-export-namespace-from',
        ],
      };
    }

    // Add legacy support for CommonJS
    return {
      ...baseConfig,
      plugins: [
        '@babel/plugin-proposal-class-properties',
        '@babel/plugin-proposal-object-rest-spread',
      ],
    };
  },
};
```

Example `libwiz.config.json`

```json
{
  "$schema": "./node_module/schemas/libwiz-schema.json",
  "root": "./",
  "srcPath": "./src",
  "buildPath": "./dist"
}
```

### Examples

#### Building for ESM format

```bash
libwiz build --target esm
```

#### Building for CommonJS format

```bash
libwiz build --target cjs
```

#### Generating build with TypeScript definition files

To create types libwiz need `tsconfig.json` or `tsconfig.build.json`

```bash
libwiz build --types
```

#### Running in watch mode

```bash
libwiz dev
```

### Default Babel Plugins and Presets

`libwiz` comes with a set of default Babel plugins and presets to simplify your build configuration. If your project doesn't specify these plugins or presets in its configuration, `libwiz` will automatically use the following versions:

| Plugin/Preset                       | Default Version |
| ----------------------------------- | --------------- |
| `@babel/core`                       | 7.28.0          |
| `@babel/preset-env`                 | 7.28.0          |
| `@babel/preset-react`               | 7.27.1          |
| `@babel/plugin-transform-react-jsx` | 7.27.1          |
| `@babel/preset-typescript`          | 7.27.1          |

If your project already has any of these plugins or presets installed in either the root `node_modules` or workspace `node_modules`, `libwiz` will automatically use your project’s versions. This ensures seamless integration and maintains compatibility with your existing setup.

### Using `customTranspiler` for Custom Transpilation

If you need full control over the transpilation process, `libwiz` offers a `customTranspiler` option. By using this, you can define a function to handle the transpilation according to your specific requirements. Here's how it works:

- **Function Definition**: `customTranspiler` expects a function that takes in `code` and `options`.
- **Code Parameter**: The `code` parameter is a `string` containing the source code that you want to transpile.
- **Options Parameter**: The `options` parameter provides useful information for transpilation and includes the following fields:
  - **`env`**: Specifies the build environment, such as `esm` or `cjs` (from the `Bundles` type).
  - **`sourceMaps`**: A `boolean` that indicates if source maps should be generated.
  - **`comments`**: A `boolean` that indicates if comments should be included in the output.

After processing, the `customTranspiler` function should return an object containing:

- **`code`**: The transpiled code as a `string`.
- **`map`** (optional): The source map as a `string`, if source maps were generated.

If `customTranspiler` returns nothing, or if it returns invalid data, `libwiz` will fall back to its default compilation process.

#### Example Usage

Here’s an example of how you might set up `customTranspiler` in your `libwiz.config.js`:

```js
module.exports = {
  // other configurations...
  customTranspiler: async (code, options) => {
    const transpiledCode = await myCustomCompile(code, options); // your custom transpile logic
    const sourceMap = generateSourceMap(transpiledCode); // optional

    return {
      code: transpiledCode,
      map: sourceMap, // return map only if generated
    };
  },
};
```

### TypeScript Configuration for Type Generation

When using `libwiz build --types` to generate TypeScript definition files, `libwiz` enhances TypeScript's configuration by supporting **glob patterns** in your `tsconfig.json` file. This allows you to use modern glob syntax, which TypeScript doesn't support by default.

> **Note**: This feature is specifically for type generation (`--types`). For regular builds, `libwiz` already handles glob patterns through its own configuration system.

> **Important**: libwiz automatically overwrites `outDir` and `rootDir` settings in your tsconfig.json for optimal type generation. This ensures proper file structure and prevents conflicts with your build configuration.

#### Glob Pattern Examples

**Brace Expansion:**

- `{ts,tsx}` - Multiple extensions in one pattern
- `{test,spec,stories}` - Multiple file types
- `{ts,tsx,js,jsx}` - Multiple file extensions
- **Example**: `src/**/*.{ts,tsx}` matches both .ts and .tsx files

**Character Classes:**

- `[jt]s` - Match .ts and .js files
- `[jt]sx` - Match .tsx and .jsx files
- **Example**: `src/**/*.[tj]s` matches .ts and .js files

**Negative Patterns:**

- `!` - Exclude files (works in include array)
- `!src/**/*.test.{ts,tsx}` - Exclude test files using `!` in include array
- `!src/**/*.spec.{ts,tsx}` - Exclude spec files
- `!src/**/*.stories.{ts,tsx}` - Exclude story files
- `!src/**/*.{test,spec,stories}.{ts,tsx}` - Exclude multiple file types at once

#### Usage in tsconfig.json

```json
{
  "include": [
    "src/**/*.[jt]s",
    "src/**/*.{ts,js}x",
    "!src/**/*.{test,spec}.{ts,tsx}"
  ],
  "exclude": ["src/ignore/**/*.{ts,tsx}", "src/**/*.{doc,example}.{ts,tsx}"]
}
```

### How to Enable Progress Bar?

By default, the progress bar is disabled to keep the output clean. You can enable it using the `--progress` flag or the `LIBWIZ_ENABLE_PROGRESS` environment variable.

```bash
# CLI flag (recommended)
libwiz build --progress

# Environment variable
LIBWIZ_ENABLE_PROGRESS=true libwiz build
```
