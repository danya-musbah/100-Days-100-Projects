// audio.js — a short, pleasant completion tone generated with the Web
// Audio API. No external audio files. The AudioContext is created lazily,
// on the first user gesture, to respect browser autoplay restrictions.

let audioContext = null;

export function primeAudio() {
  if (audioContext) return;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;
  try {
    audioContext = new AudioCtx();
  } catch {
    audioContext = null;
  }
}

function playTone(frequency, startTime, duration, gainPeak) {
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, startTime);
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(gainPeak, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(startTime);
  oscillator.stop(startTime + duration);
}

/** Play a two-note completion chime. Silently no-ops if audio is unavailable. */
export function playCompletionSound(enabled) {
  if (!enabled) return;
  if (!audioContext) primeAudio();
  if (!audioContext) return;
  try {
    if (audioContext.state === "suspended") audioContext.resume();
    const now = audioContext.currentTime;
    playTone(659.25, now, 0.35, 0.18); // E5
    playTone(987.77, now + 0.14, 0.4, 0.16); // B5
  } catch {
    // Audio is a nice-to-have; failures must never break the timer.
  }
}
