import { isMainThread, parentPort } from 'node:worker_threads';
import pc from 'picocolors';

let colorEnabled = process.env.CI !== 'true' || process.env.TERM !== 'dumb';

// handle colorEnabled based on parent as worker directly post logs to parent
parentPort?.on('message', message => {
  if (message.type === 'picocolors') {
    // only update flag in case parent send isColorSupported as boolean
    if (typeof message.data?.isColorSupported === 'boolean') {
      colorEnabled = message.data.isColorSupported;
    }
  }
});

// cache for instances - shared across all usage
const instanceCache = new Map<boolean, ReturnType<typeof pc.createColors>>();

// get the appropriate instance based on colorEnabled
const getInstance = () => {
  // in main thread, use standard picocolors instance
  if (isMainThread) return pc;

  // check if we have the instance cached
  if (!instanceCache.has(colorEnabled)) {
    // create and cache the instance
    instanceCache.set(colorEnabled, pc.createColors(colorEnabled));
  }

  // return the cached instance
  return instanceCache.get(colorEnabled)!;
};

// proxy that automatically switches between colored and non-colored versions
const createColorProxy = () => {
  return new Proxy({} as typeof pc, {
    get(_, prop) {
      const instance = getInstance();
      return instance[prop as keyof typeof instance];
    },
  });
};

export const isColorSupported = pc.isColorSupported;
export default createColorProxy();
