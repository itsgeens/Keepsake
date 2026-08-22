let audioContext: AudioContext | null = null;

export function playShutterSound() {
  if (typeof window === "undefined") return;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioCtx) return;

  if (!audioContext) audioContext = new AudioCtx();
  const context = audioContext;
  if (context.state === "suspended") void context.resume();

  const now = context.currentTime;

  // Mechanical noise burst (the "click" of the shutter blades)
  const duration = 0.15;
  const bufferSize = Math.floor(context.sampleRate * duration);
  const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    const env = Math.pow(1 - i / bufferSize, 2);
    data[i] = (Math.random() * 2 - 1) * env;
  }
  const noise = context.createBufferSource();
  noise.buffer = buffer;

  const bandpass = context.createBiquadFilter();
  bandpass.type = "bandpass";
  bandpass.frequency.value = 2200;
  bandpass.Q.value = 0.8;

  const noiseGain = context.createGain();
  noiseGain.gain.setValueAtTime(0.6, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  noise.connect(bandpass).connect(noiseGain).connect(context.destination);

  // Two short tonal "clacks" for the mechanical feel
  const clack = (start: number, freq: number) => {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.2, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.04);
    osc.connect(gain).connect(context.destination);
    osc.start(start);
    osc.stop(start + 0.05);
  };
  clack(now, 180);
  clack(now + 0.07, 120);

  noise.start(now);
  noise.stop(now + duration);
}
