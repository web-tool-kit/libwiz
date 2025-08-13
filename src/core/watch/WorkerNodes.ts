import path from 'node:path';
import { Worker } from 'node:worker_threads';
import { isColorSupported } from '@/utils/picocolors';
import { debounce } from '@/utils';
import log, { print, clearLine } from '@/utils/log';
import { copyRequiredFiles } from '@/core/postbuild';

class WorkerNodes {
  private active: Worker | null = null;
  private next: Worker | null = null;
  private running = false;
  private ready = false;
  private restarted = false;

  constructor() {
    this.active = this.createWorker();
    this.next = this.createWorker();
    this.ready = true;
  }

  private createWorker(): Worker {
    const worker = new Worker(path.resolve(__dirname, './worker.js'));
    this.attachEvents(worker);
    return worker;
  }

  private attachEvents(worker: Worker) {
    worker.postMessage({ type: 'picocolors', data: { isColorSupported } });
    worker.on('message', async data => {
      if (data.type === 'log') {
        print(data.message);
      } else if (data.type === 'clearLine') {
        clearLine();
      } else if (data.type === 'completed') {
        await copyRequiredFiles();
        this.running = false;
        this.ready = true;
      } else if (data.type === 'error') {
        log.newline();
        const er = data?.data;
        if (er) {
          if (er?.stack) {
            log.raw(er.stack);
          } else {
            log.raw(er?.message);
          }
        }
      }
    });

    worker.on('error', error => {
      console.error(error);
    });

    worker.on('exit', code => {
      if (code !== 0) {
        console.error(`Build stopped with exit code ${code}`);
      }
    });
  }

  private async cleanupWorker(worker: Worker | null) {
    if (worker) {
      try {
        worker.removeAllListeners();
        await worker.terminate();
      } catch {}
    }
  }

  // switch workers when needed usually when active worker
  // need to terminated
  private switchWorkers() {
    this.ready = false;
    this.active = this.next;
    this.next = this.createWorker();
    this.ready = true;
  }

  private manageRestart() {
    if (this.restarted) {
      clearLine();
      this.restarted = false;
    }
  }

  isRunning(): boolean {
    return Boolean(this.active && this.running);
  }

  async terminate() {
    if (this.isRunning()) {
      try {
        clearLine();
        log.info(`Change detected. Restarting build...`);
        this.ready = false;
        this.running = false;

        await this.cleanupWorker(this.active);
        this.active = null;

        this.switchWorkers();
      } catch (error) {
        console.error(error);
      }
    }
  }

  activeNode(): Worker | null {
    return this.isReady() ? this.active : null;
  }

  isReady(): boolean {
    return Boolean(this.active && this.ready);
  }

  triggerBuild(data: unknown) {
    this.manageRestart();
    this.running = true;
    this.active?.postMessage({ type: 'build', data });
  }

  run = debounce(async (data: unknown) => {
    if (this.isReady()) {
      // Only terminate if we're currently running a build
      if (this.running) {
        // terminate and start new build
        await this.terminate();
        this.triggerBuild(data);
      } else {
        // no build running, start immediately
        this.triggerBuild(data);
      }
    }
  });
}

export default WorkerNodes;
