export function createAnimationLoop(update, options = {}) {
  const fps = options.fps ?? 60;
  const maxDelta = options.maxDelta ?? 0.05;

  let animationId = null;
  let previousTime = null;
  let accumulator = 0;

  function frame(timestamp) {
    if (previousTime === null) {
      previousTime = timestamp;
    }

    const elapsed = Math.min((timestamp - previousTime) / 1000, maxDelta);

    previousTime = timestamp;

    if (fps === 0) {
      update(elapsed, timestamp / 1000);
    } else {
      const step = 1 / fps;
      accumulator += elapsed;

      while (accumulator >= step) {
        update(step, timestamp / 1000);
        accumulator -= step;
      }
    }

    animationId = requestAnimationFrame(frame);
  }

  function start() {
    if (animationId !== null) return;

    previousTime = null;
    animationId = requestAnimationFrame(frame);
  }

  function stop() {
    if (animationId === null) return;

    cancelAnimationFrame(animationId);
    animationId = null;
    previousTime = null;
    accumulator = 0;
  }

  return {
    start,
    stop,
    get running() {
      return animationId !== null;
    },
  };
} // main game loop. provide what to loop as argument like this: createAnimationLoop((dt) => {whatToDo()}))

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
} // keep value between min and max if it exceeds.

export function lerp(start, end, t) {
  return start + (end - start) * t;
}
