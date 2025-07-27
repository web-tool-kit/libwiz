import log, { clearLine } from './log';
import { isProgressDisabled } from './common';

function createProgressLoader(totalSteps: number) {
  let msg = '';
  let bar = '';
  let hasStarted = false;

  function updateBar(done?: number, total = totalSteps) {
    const barLength = 40;
    if (typeof done !== 'number' || typeof total !== 'number') {
      bar = '';
      return;
    }
    const completedLength = Math.round(barLength * (done / total));
    bar = ` ${
      '▓'.repeat(completedLength) + '-'.repeat(barLength - completedLength)
    } [${done} | ${total}]`;
  }

  return {
    track: (done?: number, total = totalSteps) => {
      if (isProgressDisabled()) return;
      updateBar(done, total);

      if (msg) {
        clearLine();
        log.progress(`${msg}${bar}`);
        hasStarted = true;
      }
    },
    stop: () => {
      if (isProgressDisabled()) return;
      if (hasStarted) {
        clearLine();
      }
      msg = '';
      hasStarted = false;
    },
    updateProgressText: (text: string) => {
      if (isProgressDisabled()) {
        log.info(text);
        log.raw('\n');
        return;
      }
      msg = text;
    },
  };
}

export default createProgressLoader;
