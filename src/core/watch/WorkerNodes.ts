import path from 'node:path';
import { Worker } from 'node:worker_threads';
import { debounce } from '../../utils';
import log, { print, clearLine } from '../../utils/log';

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
    worker.on('message', data => {
      if (data.type === 'log') {
        print(data.message);
      } else if (data.type === 'clearLine') {
        clearLine();
      } else if (data.type === 'completed') {
        this.running = false;
        this.ready = true;
      }
    });

    worker.on('error', error => {
      console.error(error);
    });

    worker.on('exit', code => {
      if (code !== 0) {
        console.error(`Worker stopped with exit code ${code}`);
      }
    });
  }

  private switchWorkers() {
    if (this.active) {
      this.ready = false;
      this.active = this.next;
      this.next = this.createWorker();
      this.ready = true;
    }
  }

  private manageRestart() {
    if (this.restarted) {
      clearLine();
      this.restarted = false;
    }
  }

  async terminate() {
    if (this.active && this.running) {
      try {
        clearLine();
        log.progress(`Change detected. Restarting build...`);
        this.ready = false;
        this.running = false;

        this.active.removeAllListeners();
        await this.active.terminate();

        this.switchWorkers();
      } catch (error) {
        console.error(error);
      }
    }
  }

  activeNode(): Worker | null {
    return this.isReady() ? this.active : null;
  }

  isRunning(): boolean {
    return Boolean(this.active && this.running);
  }

  isReady(): boolean {
    return Boolean(this.active && this.ready);
  }

  run = debounce((props: unknown) => {
    if (this.isReady()) {
      this.manageRestart();
      this.running = true;
      this.active.postMessage({ type: 'build', data: props });
    }
  });
}

export default WorkerNodes;
