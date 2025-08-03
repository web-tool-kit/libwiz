import { clone } from '@/utils';
import type { Config } from '@/types';

class ConfigStore {
  private cacheConfig: Config = {};

  public config = () => clone(this.cacheConfig);

  public hasConfig = () => {
    return Boolean(Object.keys(this.cacheConfig).length);
  };

  public setConfig(config: Config): void {
    this.cacheConfig = config;
  }
}

export default new ConfigStore();
