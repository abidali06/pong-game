let audioContext;

function getAudioContext() {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  if (audioContext.state === "suspended") {
    audioContext.resume();
  }
  return audioContext;
}

export function playSound(frequency, duration, type = "sine", volume = 0.15) {
  const ctx = getAudioContext();
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  oscillator.connect(gain);
  gain.connect(ctx.destination);

  oscillator.start();
  oscillator.stop(ctx.currentTime + duration);
}

export function playWallSound() {
  playSound(300, 0.07, "sine", 0.12);
}

export function playPaddleSound() {
  playSound(550, 0.09, "triangle", 0.16);
}

export function playScoreSound() {
  playSound(750, 0.2, "sine", 0.18);
}

export function playStartSound() {
  playSound(500, 0.1);
  setTimeout(() => playSound(750, 0.15), 100);
}

export function playGameOverSound() {
  playSound(400, 0.2);
  setTimeout(() => playSound(300, 0.25), 200);
}
