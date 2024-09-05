import log, { clearLine } from './log';

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
      updateBar(done, total);

      if (msg) {
        if (hasStarted) {
          clearLine();
        }
        log.progress(`${msg}${bar}`);
        hasStarted = true;
      }
    },
    stop: () => {
      if (hasStarted) {
        clearLine();
      }
      msg = '';
      hasStarted = false;
    },
    updateProgressText: (text: string) => {
      msg = text;
    },
  };
}

export default createProgressLoader;
