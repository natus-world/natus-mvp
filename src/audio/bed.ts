import type { BedTrack } from '@/lib/schemas';

/**
 * Sound beds, synthesised in the browser from the descriptors in
 * `data/bed-tracks.json`.
 *
 * PDR 5.7 makes `bed_tracks.license` mandatory, which is the tell: the
 * production design ships audio files and has to answer for where they came
 * from. Synthesising instead removes that question entirely and keeps the
 * repository small, at the cost of a plainer sound.
 *
 * Explicitly not binaural. Binaural beats present a different frequency to
 * each ear and are contraindicated in epilepsy; using them would mean adding a
 * question to the clinical screen. Every voice here is played identically to
 * both ears.
 */

export type Bed = {
  start: () => void;
  stop: () => void;
  setVolume: (value: number) => void;
};

/** One buffer of noise, looped. Two seconds is long enough that the loop point
 *  is inaudible under a low-pass and short enough to build instantly. */
function noiseBuffer(ctx: AudioContext, type: 'white' | 'pink' | 'brown'): AudioBuffer {
  const length = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  let brown = 0;
  // Paul Kellet's pink-noise filter — cheap, and close enough that nobody
  // running a meditation will hear the difference from a true 1/f.
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;

  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    if (type === 'white') {
      data[i] = white;
    } else if (type === 'brown') {
      brown = (brown + 0.02 * white) / 1.02;
      data[i] = brown * 3.5;
    } else {
      b0 = 0.99765 * b0 + white * 0.099046;
      b1 = 0.963 * b1 + white * 0.2965164;
      b2 = 0.57555 * b2 + white * 1.0526913;
      data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.25;
    }
  }

  return buffer;
}

/** How long two passes of a recorded track overlap, in seconds. */
export const CROSSFADE_SECONDS = 8;

/**
 * A recorded track, looped as Spotify's crossfade does (owner, 29 Oct 2026):
 * a few seconds before it ends it starts again underneath while the end fades
 * out, so the music never stops or jumps however long the practice runs.
 *
 * Two <audio> elements through the audio graph rather than a decoded buffer:
 * six minutes of decoded stereo is over a hundred megabytes, too much for a
 * phone. Both are started inside the touch that began the practice — iPhone
 * refuses to start an element later otherwise — and the second waits paused.
 */
function fileBed(ctx: AudioContext, url: string, destination: AudioNode): Bed {
  const output = ctx.createGain();
  output.gain.value = 0;
  output.connect(destination);

  const make = () => {
    const element = new Audio(url);
    element.preload = 'auto';
    const gain = ctx.createGain();
    gain.gain.value = 0;
    ctx.createMediaElementSource(element).connect(gain).connect(output);
    return { element, gain };
  };
  const passes = [make(), make()];
  let stopped = false;

  const fadeTo = (gain: GainNode, value: number, seconds: number) => {
    const now = ctx.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(value, now + seconds);
  };

  const watch = (index: number) => {
    const pass = passes[index]!;
    let handed = false;
    pass.element.ontimeupdate = () => {
      if (stopped || handed) return;
      const left = pass.element.duration - pass.element.currentTime;
      if (!Number.isFinite(left) || left > CROSSFADE_SECONDS) return;
      handed = true;
      const next = 1 - index;
      const other = passes[next]!;
      other.element.currentTime = 0;
      void other.element.play().catch(() => {});
      fadeTo(other.gain, 1, CROSSFADE_SECONDS);
      fadeTo(pass.gain, 0, CROSSFADE_SECONDS);
      watch(next);
    };
    pass.element.onended = () => {
      pass.element.ontimeupdate = null;
    };
  };

  return {
    start() {
      const first = passes[0]!;
      const second = passes[1]!;
      // Leave from the touch for both; the second waits.
      void second.element.play().then(() => second.element.pause()).catch(() => {});
      void first.element.play().catch(() => {});
      fadeTo(first.gain, 1, 3);
      watch(0);
    },
    stop() {
      stopped = true;
      for (const pass of passes) {
        pass.element.pause();
        pass.element.ontimeupdate = null;
        pass.element.removeAttribute('src');
      }
      output.disconnect();
    },
    setVolume(value) {
      output.gain.cancelScheduledValues(ctx.currentTime);
      output.gain.setTargetAtTime(value, ctx.currentTime, 0.08);
    },
  };
}

export function createBed(
  ctx: AudioContext,
  track: BedTrack,
  destination: AudioNode,
  /** Only an explicit «No» to epilepsy (owner, 29 Oct 2026). */
  binaural = false,
): Bed {
  if (track.file) {
    const path = binaural && track.file.binaural_path ? track.file.binaural_path : track.file.path;
    return fileBed(ctx, `${import.meta.env.BASE_URL}${path}`, destination);
  }
  const synthesis = track.synthesis ?? { voices: [], noise: null, lfo: null };
  const output = ctx.createGain();
  output.gain.value = 0;
  output.connect(destination);

  // The swell is its own stage so the listener's volume and the slow breathing
  // of the bed do not fight over one AudioParam. A signal connected to a param
  // is summed with its value, so modulating `output.gain` directly would make
  // the depth of the swell depend on how loud the person set it.
  const swell = ctx.createGain();
  swell.connect(output);

  const sources: (OscillatorNode | AudioBufferSourceNode)[] = [];
  let started = false;

  for (const voice of synthesis.voices) {
    const osc = ctx.createOscillator();
    osc.type = voice.type;
    osc.frequency.value = voice.hz;
    const gain = ctx.createGain();
    gain.gain.value = voice.gain;
    osc.connect(gain).connect(swell);
    sources.push(osc);
  }

  if (synthesis.noise) {
    const source = ctx.createBufferSource();
    source.buffer = noiseBuffer(ctx, synthesis.noise.type);
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = synthesis.noise.lowpass_hz;
    const gain = ctx.createGain();
    gain.gain.value = synthesis.noise.gain;
    source.connect(filter).connect(gain).connect(swell);
    sources.push(source);
  }

  // The slow swell. Without it a pure drone reads as a machine humming rather
  // than as something breathing. It rides between `1 - depth` and `1`, so the
  // bed only ever ducks below its set level and never jumps above it.
  const depth = synthesis.lfo?.depth ?? 0;
  swell.gain.value = 1 - depth / 2;

  if (synthesis.lfo) {
    const lfo = ctx.createOscillator();
    lfo.frequency.value = synthesis.lfo.hz;
    const amount = ctx.createGain();
    amount.gain.value = depth / 2;
    lfo.connect(amount).connect(swell.gain);
    sources.push(lfo);
  }

  return {
    start() {
      if (started) return;
      started = true;
      for (const source of sources) source.start();
    },
    stop() {
      for (const source of sources) {
        try {
          source.stop();
        } catch {
          // Already stopped, or never started. Either way there is nothing to
          // do and nothing worth telling anyone about.
        }
      }
      swell.disconnect();
      output.disconnect();
    },
    setVolume(value) {
      // A ramp rather than a jump: a step change in gain on a sustained tone
      // is audible as a click.
      output.gain.cancelScheduledValues(ctx.currentTime);
      output.gain.setTargetAtTime(value, ctx.currentTime, 0.08);
    },
  };
}
