export type SoundPreferences = { enabled: boolean; music: number; effects: number };
export type CasinoCue = "spin" | "chip" | "win" | "loss";
export const SOUND_STORAGE_KEY = "zkspin-sound-v1";
export const DEFAULT_SOUND: SoundPreferences = { enabled: true, music: 0.24, effects: 0.45 };

export function parseSoundPreferences(raw: string | null): SoundPreferences {
  try {
    const value = JSON.parse(raw ?? "null");
    if (!value || typeof value.enabled !== "boolean") return { ...DEFAULT_SOUND };
    const volume = (n: unknown, fallback: number) => typeof n === "number" && Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : fallback;
    return { enabled: value.enabled, music: volume(value.music, DEFAULT_SOUND.music), effects: volume(value.effects, DEFAULT_SOUND.effects) };
  } catch { return { ...DEFAULT_SOUND }; }
}

const frequency = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

// Original eight-bar lounge waltz, synthesized locally; no third-party recordings.
export function renderLounge(sampleRate: number): Float32Array {
  const beat = 60 / 88;
  const duration = beat * 24;
  const data = new Float32Array(Math.ceil(duration * sampleRate));
  const chords = [[45,57,60,64], [50,57,62,65], [43,55,59,62], [48,55,60,64], [41,57,60,65], [50,57,62,65], [40,56,59,64], [45,57,60,64]];
  const melody = [[76,0,72,71,69,0], [74,0,77,76,74,0], [74,71,67,0,71,74], [76,0,79,76,72,0], [77,76,72,0,69,72], [74,0,69,72,74,0], [71,0,68,71,76,74], [72,71,69,0,0,0]];
  function note(midi: number, at: number, seconds: number, level: number, voice: "pluck" | "reed" | "bass") {
    const f = frequency(midi);
    const start = Math.floor(at * sampleRate);
    for (let i = 0; i < seconds * sampleRate; i++) {
      const t = i / sampleRate;
      const phase = 2 * Math.PI * f * t;
      const envelope = Math.min(1, t / 0.012) * Math.min(1, (seconds - t) / 0.1);
      const tone = voice === "pluck"
        ? (Math.sin(phase) + 0.35 * Math.sin(2 * phase) + 0.13 * Math.sin(3 * phase)) * Math.exp(-t * 6)
        : voice === "reed"
          ? (Math.sin(phase) + 0.18 * Math.sin(2 * phase) + 0.08 * Math.sin(3 * phase)) * (0.9 + 0.1 * Math.sin(t * 2 * Math.PI * 4.8))
          : Math.sin(phase) * Math.exp(-t * 4);
      data[(start + i) % data.length] += tone * envelope * level;
    }
  }
  chords.forEach((chord, bar) => {
    const at = bar * beat * 3;
    note(chord[0], at, beat * 1.4, 0.2, "bass");
    for (const pulse of [1, 2]) chord.slice(1).forEach(n => note(n, at + beat * pulse, beat * 0.7, 0.035, "reed"));
    melody[bar].forEach((n, index) => {
      if (n) {
        note(n, at + index * beat / 2, beat * 1.4, 0.17, "pluck");
        note(n, at + index * beat / 2 + 0.16, beat, 0.035, "pluck");
      }
    });
  });
  return data;
}

export function renderCue(cue: CasinoCue, sampleRate: number): Float32Array {
  const duration = cue === "spin" ? 3 : cue === "win" ? 1.1 : 0.35;
  const data = new Float32Array(Math.ceil(sampleRate * duration));
  function tone(hz: number, at: number, length: number, level: number) {
    for (let i = 0; i < length * sampleRate; i++) {
      const index = Math.floor(at * sampleRate) + i;
      if (index >= data.length) break;
      const t = i / sampleRate;
      data[index] += Math.sin(2 * Math.PI * hz * t) * Math.exp(-t * 12 / length) * Math.min(1, t / 0.002) * level;
    }
  }
  if (cue === "spin") {
    let seed = 8723;
    let smooth = 0;
    for (let i = 0; i < data.length; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      smooth = smooth * 0.72 + (seed / 4294967296 * 2 - 1) * 0.28;
      const t = i / sampleRate;
      data[i] = smooth * 0.25 * Math.min(1, t * 10) * Math.max(0, 1 - t / 3);
    }
    for (let t = 0.04; t < 2.85; t += 0.035 + 0.21 * (t / 3) ** 2) tone(1250 - t * 180, t, 0.075, 0.3);
    tone(430, 2.88, 0.12, 0.32);
  } else if (cue === "win") {
    [523.25, 659.25, 783.99].forEach((hz, i) => tone(hz, i * 0.14, 0.65, 0.3));
  } else tone(cue === "chip" ? 1500 : 330, 0, duration, cue === "chip" ? 0.25 : 0.12);
  return data;
}

export class CasinoAudio {
  private context: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private effectsGain: GainNode | null = null;
  private music: AudioBufferSourceNode | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private sources = new Set<AudioBufferSourceNode>();
  private preferences = { ...DEFAULT_SOUND };
  private generation = 0;
  private disposed = false;

  private buffer(name: "music" | CasinoCue) {
    if (!this.buffers.has(name)) {
      const samples = name === "music" ? renderLounge(22050) : renderCue(name, 22050);
      const buffer = this.context!.createBuffer(1, samples.length, 22050);
      buffer.copyToChannel(new Float32Array(samples), 0);
      this.buffers.set(name, buffer);
    }
    return this.buffers.get(name)!;
  }

  setPreferences(preferences: SoundPreferences) {
    this.preferences = preferences;
    if (this.context) {
      this.musicGain?.gain.setTargetAtTime(preferences.music, this.context.currentTime, 0.08);
      this.effectsGain?.gain.setTargetAtTime(preferences.effects, this.context.currentTime, 0.03);
    }
    if (!preferences.enabled) this.pause();
  }

  async start(): Promise<boolean> {
    if (this.disposed || !this.preferences.enabled) return false;
    const generation = this.generation;
    try {
      if (!this.context) {
        this.context = new AudioContext();
        const compressor = this.context.createDynamicsCompressor();
        compressor.connect(this.context.destination);
        this.musicGain = this.context.createGain();
        this.effectsGain = this.context.createGain();
        this.musicGain.connect(compressor);
        this.effectsGain.connect(compressor);
        this.setPreferences(this.preferences);
      }
      await this.context.resume();
      if (generation !== this.generation || this.disposed || !this.preferences.enabled) return false;
      if (!this.music) {
        this.music = this.context.createBufferSource();
        this.music.buffer = this.buffer("music");
        this.music.loop = true;
        this.music.connect(this.musicGain!);
        this.music.start();
      }
      return this.context.state === "running";
    } catch { return false; }
  }

  play(cue: CasinoCue): () => void {
    if (!this.preferences.enabled || this.context?.state !== "running" || !this.effectsGain) return () => {};
    const source = this.context.createBufferSource();
    source.buffer = this.buffer(cue);
    source.connect(this.effectsGain);
    this.sources.add(source);
    source.onended = () => { source.disconnect(); this.sources.delete(source); };
    source.start();
    return () => { if (this.sources.delete(source)) { source.stop(); source.disconnect(); } };
  }

  pause() {
    this.generation++;
    this.music?.stop();
    this.music?.disconnect();
    this.music = null;
    this.sources.forEach(source => { source.stop(); source.disconnect(); });
    this.sources.clear();
    void this.context?.suspend().catch(() => {});
  }

  dispose() {
    this.pause();
    this.disposed = true;
    void this.context?.close().catch(() => {});
    this.buffers.clear();
  }
}
