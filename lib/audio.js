let audioCtx = null;

export function unlockAudio() {
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    audioCtx = new Ctx();
  }
  // Play a silent buffer to satisfy iOS gesture requirement
  const buf = audioCtx.createBuffer(1, 1, 22050);
  const src = audioCtx.createBufferSource();
  src.buffer = buf;
  src.connect(audioCtx.destination);
  src.start(0);
}

export function resumeAudio() {
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
}

export function beep(frequency = 880, duration = 0.12, volume = 0.5) {
  if (!audioCtx || audioCtx.state !== "running") return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.frequency.value = frequency;
  osc.type = "sine";
  gain.gain.setValueAtTime(volume, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(
    0.001,
    audioCtx.currentTime + duration
  );
  osc.start(audioCtx.currentTime);
  osc.stop(audioCtx.currentTime + duration + 0.01);
}

export function warmupSpeech() {
  if (!window.speechSynthesis) return;
  const utt = new SpeechSynthesisUtterance("");
  utt.volume = 0;
  window.speechSynthesis.speak(utt);
}

export function speak(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.rate = 0.9;
  utt.volume = 1.0;
  window.speechSynthesis.speak(utt);
}
