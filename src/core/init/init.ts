import path from 'node:path';
import fse from 'fs-extra';
import pc from '@/utils/picocolors';
import log from '@/utils/log';

const SAMPLE_CONFIG = `
/**
 * @type {import('libwiz').Config}
 */
module.exports = {
  srcPath: './src',
  output: {
    dir: './dist',
    target: ['esm', 'cjs'],
    sourceMap: true,
  },
  extensions: ['.js', '.jsx', '.ts', '.tsx'],
  compiler: {
    presets: [
      // Add your presets here
      // ['@babel/preset-react', { runtime: 'automatic' }],
    ],
    plugins: [
      // Add your plugins here
    ],
  },
};
`.trim();

async function init() {
  const configPath = path.resolve(process.cwd(), 'libwiz.config.js');

  try {
    // check if config file already exists
    if (await fse.pathExists(configPath)) {
      log.warn(
        `${pc.yellow('libwiz.config.js')} already exists in the current directory.`,
      );
      log.info(
        'If you want to overwrite it, please delete the existing file first.',
      );
      return;
    }

    // create the config file
    await fse.writeFile(configPath, SAMPLE_CONFIG, 'utf8');

    log.done(
      `Successfully created ${pc.green('libwiz.config.js')} in the current directory.`,
    );
    log.info(
      'You can now customize the configuration according to your project needs.',
    );
    log.info(`Run ${pc.cyan('libwiz build')} to start building your library.`);
    log.info(
      `For detailed configuration options, visit: ${pc.cyan('https://www.npmjs.com/package/libwiz')}`,
    );
  } catch (error) {
    log.error(
      `Failed to create config file: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  }
}

export default init;
