/**
 * The chiptune player: synthesises the score in audio/logic/score.ts with
 * WebAudio (pulse waves at 12.5/25/50% duty, a triangle bass, noise drums),
 * plus short sound effects. No audio files, so nothing to download and it
 * works offline. Browsers only allow sound after the player presses
 * something, so `unlock()` is called on the first key or tap.
 */
import { DEVICE_SCOPE, getSetting, setSetting } from '@/platform';
import { frequency, TRACKS, type Note, type TrackId, type Wave } from './logic/score';

export type Sfx =
  | 'blip'
  | 'cursor'
  | 'select'
  | 'door'
  | 'bump'
  | 'coin'
  | 'spend'
  | 'learn'
  | 'right'
  | 'wrong'
  | 'spot'
  | 'hit'
  | 'open';

export type AudioSettings = { music: number; sfx: number; muted: boolean };

const DEFAULTS: AudioSettings = { music: 0.5, sfx: 0.6, muted: false };
const SETTINGS_KEY = 'paisapur.audio';

type Playing = { id: TrackId; gain: GainNode; timer: number | null };

class Chiptune {
  private ctx: AudioContext | null = null;
  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private waves = new Map<Wave, PeriodicWave>();
  private noise: AudioBuffer | null = null;
  private current: Playing | null = null;
  private wanted: TrackId | null = null;
  private jingleUntil = 0;
  settings: AudioSettings = { ...DEFAULTS };
  /** True while someone is being read aloud, so the music sits quietly under the voice. */
  private ducked = false;
  private listeners = new Set<() => void>();

  /** Loads saved volumes (call once at start). */
  async load(): Promise<void> {
    const saved = await getSetting<AudioSettings>(DEVICE_SCOPE, SETTINGS_KEY);
    if (saved) this.settings = { ...DEFAULTS, ...saved };
    this.apply();
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Lowers the music while a voice is speaking. Not saved: it is a moment, not a setting. */
  duck(on: boolean): void {
    if (this.ducked === on) return;
    this.ducked = on;
    this.apply();
  }

  update(patch: Partial<AudioSettings>): void {
    this.settings = { ...this.settings, ...patch };
    this.apply();
    void setSetting(DEVICE_SCOPE, SETTINGS_KEY, this.settings);
    this.listeners.forEach((fn) => fn());
  }

  private apply() {
    if (!this.ctx || !this.musicBus || !this.sfxBus) return;
    const now = this.ctx.currentTime;
    this.musicBus.gain.setTargetAtTime(this.settings.muted ? 0 : this.settings.music * (this.ducked ? 0.12 : 1), now, 0.15);
    this.sfxBus.gain.setTargetAtTime(this.settings.muted ? 0 : this.settings.sfx, now, 0.02);
  }

  /** Creates the audio context on the first user gesture. */
  unlock(): void {
    if (typeof window === 'undefined' || !('AudioContext' in window)) return;
    if (!this.ctx) {
      const ctx = new AudioContext();
      this.ctx = ctx;
      const master = ctx.createGain();
      master.gain.value = 0.9;
      master.connect(ctx.destination);
      this.musicBus = ctx.createGain();
      this.sfxBus = ctx.createGain();
      this.musicBus.connect(master);
      this.sfxBus.connect(master);
      for (const [wave, duty] of [
        ['pulse12', 0.125],
        ['pulse25', 0.25],
        ['pulse50', 0.5],
      ] as const) {
        this.waves.set(wave, pulseWave(ctx, duty));
      }
      this.noise = noiseBuffer(ctx);
      this.apply();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    if (this.wanted && !this.current) this.play(this.wanted);
  }

  /** Plays a looping track (or keeps playing it if it already is). */
  play(id: TrackId): void {
    this.wanted = id;
    if (!this.ctx || !this.musicBus) return;
    if (this.current?.id === id) return;
    this.stop(0.25);
    const gain = this.ctx.createGain();
    gain.connect(this.musicBus);
    const playing: Playing = { id, gain, timer: null };
    this.current = playing;
    const startAt = Math.max(this.ctx.currentTime + 0.05, this.jingleUntil);
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.setValueAtTime(1, startAt);
    this.scheduleLoop(playing, startAt);
  }

  /** Fades the music out. */
  stop(fade = 0.4): void {
    const p = this.current;
    if (!p || !this.ctx) return;
    this.current = null;
    if (p.timer !== null) window.clearTimeout(p.timer);
    const now = this.ctx.currentTime;
    p.gain.gain.cancelScheduledValues(now);
    p.gain.gain.setValueAtTime(p.gain.gain.value, now);
    p.gain.gain.linearRampToValueAtTime(0, now + fade);
    window.setTimeout(() => p.gain.disconnect(), (fade + 0.1) * 1000);
  }

  /** A short tune over a pause in the music (badges, goals, battle results); the music resumes after. */
  jingle(id: TrackId): void {
    if (!this.ctx || !this.musicBus) return;
    const resume = this.wanted;
    this.stop(0.15);
    const gain = this.ctx.createGain();
    gain.connect(this.musicBus);
    const start = this.ctx.currentTime + 0.1;
    const end = this.schedule(id, gain, start);
    this.jingleUntil = end + 0.2;
    window.setTimeout(() => gain.disconnect(), (end - this.ctx.currentTime + 0.5) * 1000);
    if (resume) {
      this.wanted = null;
      this.play(resume);
    }
  }

  private scheduleLoop(p: Playing, startAt: number) {
    if (!this.ctx || this.current !== p) return;
    const end = this.schedule(p.id, p.gain, startAt);
    // Queue the next pass well before this one ends (timers slow down in background tabs).
    const lead = Math.max(0.05, end - this.ctx.currentTime - 2);
    p.timer = window.setTimeout(() => this.scheduleLoop(p, end), lead * 1000);
  }

  /** Schedules one pass of a track. Returns when it ends. */
  private schedule(id: TrackId, out: AudioNode, startAt: number): number {
    const track = TRACKS[id];
    const step = 60 / track.bpm / 4;
    let end = startAt;
    for (const voice of track.voices) {
      let at = startAt;
      for (const note of voice.notes) {
        const dur = note.steps * step;
        if (note.pitch) this.note(out, voice.wave, voice.gain, note, at, dur);
        at += dur;
      }
      end = Math.max(end, at);
    }
    return end;
  }

  private note(out: AudioNode, wave: Wave, level: number, note: Note, at: number, dur: number) {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    g.connect(out);
    if (wave === 'noise') {
      if (note.pitch === 'kick') {
        const o = ctx.createOscillator();
        o.frequency.setValueAtTime(150, at);
        o.frequency.exponentialRampToValueAtTime(45, at + 0.12);
        envelope(g.gain, at, 0.14, level * 3.5);
        o.connect(g);
        o.start(at);
        o.stop(at + 0.16);
        return;
      }
      const src = ctx.createBufferSource();
      src.buffer = this.noise;
      const filter = ctx.createBiquadFilter();
      filter.type = note.pitch === 'hat' ? 'highpass' : 'bandpass';
      filter.frequency.value = note.pitch === 'hat' ? 7000 : 1800;
      src.connect(filter);
      filter.connect(g);
      const len = note.pitch === 'hat' ? 0.04 : 0.12;
      envelope(g.gain, at, len, level * (note.pitch === 'hat' ? 1 : 2));
      src.start(at);
      src.stop(at + len + 0.02);
      return;
    }
    const f = frequency(note.pitch);
    if (!f) return;
    const o = ctx.createOscillator();
    const pw = this.waves.get(wave);
    if (pw) o.setPeriodicWave(pw);
    else o.type = 'triangle';
    o.frequency.setValueAtTime(f, at);
    o.connect(g);
    const len = Math.max(0.03, dur * 0.9);
    envelope(g.gain, at, len, level);
    o.start(at);
    o.stop(at + len + 0.05);
  }

  /** Plays a sound effect. */
  sfx(name: Sfx): void {
    if (!this.ctx || !this.sfxBus || this.settings.muted) return;
    const t = this.ctx.currentTime + 0.01;
    const tone = (pitch: string, at: number, dur: number, wave: Wave = 'pulse25', level = 0.18) =>
      this.note(this.sfxBus!, wave, level, { pitch, steps: 1 }, at, dur);
    switch (name) {
      case 'blip':
        return tone('A5', t, 0.035, 'pulse12', 0.12);
      case 'cursor':
        return tone('E5', t, 0.03, 'pulse12', 0.1);
      case 'select':
      case 'open':
        tone('C6', t, 0.04);
        return tone('E6', t + 0.045, 0.06);
      case 'door':
        tone('G4', t, 0.05, 'pulse50', 0.12);
        tone('C4', t + 0.06, 0.08, 'pulse50', 0.12);
        return this.note(this.sfxBus, 'noise', 0.1, { pitch: 'snare', steps: 1 }, t, 0.1);
      case 'bump':
        return tone('C3', t, 0.06, 'triangle', 0.3);
      case 'coin':
        tone('B5', t, 0.05);
        return tone('E6', t + 0.06, 0.16);
      case 'spend':
        tone('E5', t, 0.05, 'pulse50', 0.12);
        return tone('C5', t + 0.06, 0.1, 'pulse50', 0.12);
      case 'learn':
        ['G5', 'C6', 'E6', 'G6'].forEach((p, i) => tone(p, t + i * 0.06, 0.08, 'pulse12', 0.14));
        return;
      case 'right':
        ['C5', 'E5', 'G5', 'C6'].forEach((p, i) => tone(p, t + i * 0.05, 0.07));
        return;
      case 'wrong':
        tone('G3', t, 0.12, 'pulse50', 0.14);
        return tone('F#3', t + 0.13, 0.2, 'pulse50', 0.14);
      case 'spot':
        ['E6', 'G6', 'B6'].forEach((p, i) => tone(p, t + i * 0.04, 0.06));
        return;
      case 'hit':
        this.note(this.sfxBus, 'noise', 0.15, { pitch: 'snare', steps: 1 }, t, 0.15);
        return tone('A2', t, 0.18, 'pulse50', 0.18);
    }
  }
}

function envelope(param: AudioParam, at: number, len: number, level: number) {
  param.setValueAtTime(0, at);
  param.linearRampToValueAtTime(level, at + 0.005);
  param.linearRampToValueAtTime(level * 0.7, at + Math.min(len * 0.5, 0.15));
  param.setValueAtTime(level * 0.7, Math.max(at + 0.006, at + len - 0.02));
  param.linearRampToValueAtTime(0, at + len);
}

/** A pulse wave with the given duty cycle, built from its Fourier series. */
function pulseWave(ctx: AudioContext, duty: number): PeriodicWave {
  const n = 48;
  const real = new Float32Array(n);
  const imag = new Float32Array(n);
  for (let k = 1; k < n; k++) {
    const a = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
    real[k] = a * Math.cos(k * Math.PI * duty);
    imag[k] = a * Math.sin(k * Math.PI * duty);
  }
  return ctx.createPeriodicWave(real, imag);
}

function noiseBuffer(ctx: AudioContext): AudioBuffer {
  const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

/** The one player for the whole game. */
export const audio = new Chiptune();

// Development only: lets you inspect the player from the browser console.
if (import.meta.env.DEV && typeof window !== 'undefined') (window as unknown as { __paisapurAudio: Chiptune }).__paisapurAudio = audio;
