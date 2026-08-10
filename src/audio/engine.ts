import workletUrl from './string-processor.js?url';
import { instrumentById, type Instrument, type PluckedPreset, type SustainedPreset } from './instruments';

/** Cents of pitch swing at full gamak — roughly a semitone, as in andolan. */
const GAMAK_MAX_CENTS = 115;

function clamp(v: number, lo: number, hi: number) {
    // NaN fails every comparison, so it would slip through a plain min/max and
    // throw when it reached an AudioParam. Treat it as the low end.
    if (!Number.isFinite(v)) return lo;
    return v < lo ? lo : v > hi ? hi : v;
}

/**
 * Move a param to a target over `glide` seconds. Pitch ramps exponentially so
 * a slide sounds even across its whole span.
 */
function ramp(param: AudioParam, target: number, glide: number, now: number, exponential = false) {
    const safe = Math.max(target, 1e-4);
    if (typeof param.cancelAndHoldAtTime === 'function') param.cancelAndHoldAtTime(now);
    else param.cancelScheduledValues(now);
    if (glide <= 0.006) {
        param.setValueAtTime(safe, now);
    } else if (exponential) {
        param.setValueAtTime(Math.max(param.value, 1e-4), now);
        param.exponentialRampToValueAtTime(safe, now + glide);
    } else {
        param.setValueAtTime(param.value, now);
        param.linearRampToValueAtTime(target, now + glide);
    }
}

function makeNoiseBuffer(ctx: BaseAudioContext): AudioBuffer {
    const len = Math.floor(ctx.sampleRate * 2);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
}

/**
 * A synthetic hall. Exponentially decaying noise, slightly darker over time,
 * with the two channels decorrelated so it opens up in stereo.
 */
function makeReverbIR(ctx: BaseAudioContext, seconds: number, decay: number): AudioBuffer {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
        const data = buf.getChannelData(ch);
        let lp = 0;
        for (let i = 0; i < len; i++) {
            const t = i / len;
            const env = Math.pow(1 - t, decay);
            const n = (Math.random() * 2 - 1) * env;
            // Roll off the tail so late reflections darken, as real rooms do.
            lp += (0.42 - 0.3 * t) * (n - lp);
            data[i] = lp * 2.2;
        }
    }
    return buf;
}

interface VoiceCommon {
    readonly out: GainNode;
    noteOn(freq: number, velocity: number): void;
    setFrequency(freq: number, glide: number): void;
    setIntensity(v: number): void;
    /** −1 dark to 1 bright, driven by expression-hand tilt. */
    setTone(bias: number): void;
    /** Whether released notes ring out or are damped. */
    setSustain(on: boolean): void;
    setGamak(depth: number): void;
    noteOff(): void;
    kill(): void;
    dispose(): void;
}

// ---------------------------------------------------------------------------

class PluckedVoice implements VoiceCommon {
    readonly out: GainNode;
    private node: AudioWorkletNode;
    private body: BiquadFilterNode;
    private tone: BiquadFilterNode;
    private freqParam: AudioParam;
    private loopParam: AudioParam;
    private lfo: OscillatorNode;
    private lfoGain: GainNode;
    private freq = 220;
    private gamakDepth = 0;
    private intensity = 0;
    private toneBias = 0;
    private sustain = true;
    private ctx: AudioContext;
    private preset: PluckedPreset;

    constructor(ctx: AudioContext, preset: PluckedPreset) {
        this.ctx = ctx;
        this.preset = preset;
        this.node = new AudioWorkletNode(ctx, 'string-processor', {
            numberOfInputs: 0,
            numberOfOutputs: 1,
            outputChannelCount: [1],
        });
        this.freqParam = this.node.parameters.get('frequency')!;
        this.loopParam = this.node.parameters.get('loopGain')!;
        this.node.parameters.get('damping')!.value = preset.damping;
        this.node.parameters.get('jawari')!.value = preset.jawari;
        this.loopParam.value = preset.loopGain;

        this.body = ctx.createBiquadFilter();
        this.body.type = 'peaking';
        this.body.frequency.value = preset.body.freq;
        this.body.gain.value = preset.body.gain;
        this.body.Q.value = preset.body.q;

        this.tone = ctx.createBiquadFilter();
        this.tone.type = 'lowpass';
        this.tone.frequency.value = 6000;
        this.tone.Q.value = 0.5;

        this.out = ctx.createGain();
        this.out.gain.value = preset.gain;

        // The gamak LFO drives frequency in Hz, so its depth is rescaled every
        // time the note moves.
        this.lfo = ctx.createOscillator();
        this.lfo.type = 'sine';
        this.lfo.frequency.value = 5;
        this.lfoGain = ctx.createGain();
        this.lfoGain.gain.value = 0;
        this.lfo.connect(this.lfoGain).connect(this.freqParam);
        this.lfo.start();

        this.node.connect(this.body).connect(this.tone).connect(this.out);
    }

    private applyGamak() {
        const cents = this.gamakDepth * GAMAK_MAX_CENTS;
        const hz = this.freq * (Math.pow(2, cents / 1200) - 1);
        const now = this.ctx.currentTime;
        this.lfoGain.gain.setTargetAtTime(hz, now, 0.04);
        this.lfo.frequency.setTargetAtTime(4.6 + this.gamakDepth * 3.4, now, 0.08);
    }

    noteOn(freq: number, velocity: number) {
        const now = this.ctx.currentTime;
        this.freq = freq;
        this.freqParam.cancelScheduledValues(now);
        this.freqParam.setValueAtTime(freq, now);
        this.loopParam.cancelScheduledValues(now);
        this.loopParam.setValueAtTime(this.preset.loopGain, now);
        this.applyGamak();
        this.node.port.postMessage({
            type: 'pluck',
            velocity: 0.25 + velocity * 0.6,
            brightness: this.preset.brightness,
            position: this.preset.position,
        });
    }

    setFrequency(freq: number, glide: number) {
        this.freq = freq;
        ramp(this.freqParam, freq, glide, this.ctx.currentTime, true);
        this.applyGamak();
    }

    setIntensity(v: number) {
        this.intensity = v;
        // A slight curve so the quiet end of the hand's travel is usable and the
        // gain genuinely reaches silence.
        this.out.gain.setTargetAtTime(this.preset.gain * Math.pow(v, 1.4), this.ctx.currentTime, 0.035);
        this.updateTone();
    }

    setTone(bias: number) {
        this.toneBias = clamp(bias, -1, 1);
        this.updateTone();
    }

    private updateTone() {
        // Playing harder opens the tone up, the way real strings brighten; the
        // bias from hand tilt sweeps it three-fold either side of that.
        const cutoff = clamp(
            (1200 + this.intensity * 7000) * this.preset.toneMult * Math.pow(3, this.toneBias),
            250,
            18000
        );
        this.tone.frequency.setTargetAtTime(cutoff, this.ctx.currentTime, 0.05);
    }

    setGamak(depth: number) {
        this.gamakDepth = depth;
        this.applyGamak();
    }

    setSustain(on: boolean) {
        this.sustain = on;
    }

    noteOff() {
        // Releasing is a palm on the strings, not a gate: the string keeps ringing
        // but loses energy fast. With sustain on it is allowed to ring out.
        const now = this.ctx.currentTime;
        this.loopParam.cancelScheduledValues(now);
        const target = this.sustain ? 1 - (1 - this.preset.dampGain) * 0.18 : this.preset.dampGain;
        this.loopParam.setTargetAtTime(target, now, 0.03);
    }

    kill() {
        const now = this.ctx.currentTime;
        this.loopParam.cancelScheduledValues(now);
        this.loopParam.setTargetAtTime(0.55, now, 0.02);
    }

    dispose() {
        try {
            this.lfo.stop();
        } catch {
            /* already stopped */
        }
        this.node.port.postMessage({ type: 'silence' });
        this.node.disconnect();
        this.body.disconnect();
        this.tone.disconnect();
        this.out.disconnect();
        this.lfoGain.disconnect();
    }
}

// ---------------------------------------------------------------------------

class SustainedVoice implements VoiceCommon {
    readonly out: GainNode;
    private oscs: OscillatorNode[] = [];
    private vca: GainNode;
    private filter: BiquadFilterNode;
    private noiseSrc: AudioBufferSourceNode;
    private noiseBp: BiquadFilterNode;
    private noiseGain: GainNode;
    private lfo: OscillatorNode;
    private lfoGain: GainNode;
    private freq = 220;
    private intensity = 0;
    private toneBias = 0;
    private sustain = true;
    private gate = false;
    private ctx: AudioContext;
    private preset: SustainedPreset;

    constructor(ctx: AudioContext, preset: SustainedPreset, noiseBuffer: AudioBuffer) {
        this.ctx = ctx;
        this.preset = preset;
        this.out = ctx.createGain();
        this.out.gain.value = preset.gain;

        this.vca = ctx.createGain();
        this.vca.gain.value = 0;

        this.filter = ctx.createBiquadFilter();
        this.filter.type = 'lowpass';
        this.filter.Q.value = preset.filter.q;
        this.filter.frequency.value = preset.filter.base + preset.filter.mult * 220;

        // Formants sit between the filter and the VCA so they colour the tone but
        // not the envelope.
        let tail: AudioNode = this.filter;
        for (const f of preset.formants) {
            const bq = ctx.createBiquadFilter();
            bq.type = 'peaking';
            bq.frequency.value = f.freq;
            bq.gain.value = f.gain;
            bq.Q.value = f.q;
            tail.connect(bq);
            tail = bq;
        }
        tail.connect(this.vca);
        this.vca.connect(this.out);

        this.lfo = ctx.createOscillator();
        this.lfo.type = 'sine';
        this.lfo.frequency.value = preset.vibrato.rate || 5;
        this.lfoGain = ctx.createGain();
        this.lfoGain.gain.value = preset.vibrato.cents;
        this.lfo.connect(this.lfoGain);
        this.lfo.start();

        for (const spec of preset.oscs) {
            const osc = ctx.createOscillator();
            osc.type = spec.type;
            osc.frequency.value = 220 * spec.harmonic;
            osc.detune.value = spec.detune;
            const g = ctx.createGain();
            g.gain.value = spec.gain;
            osc.connect(g).connect(this.filter);
            // Detune is in cents, so one LFO drives every partial by the same
            // musical interval.
            this.lfoGain.connect(osc.detune);
            osc.start();
            this.oscs.push(osc);
        }

        this.noiseSrc = ctx.createBufferSource();
        this.noiseSrc.buffer = noiseBuffer;
        this.noiseSrc.loop = true;
        this.noiseBp = ctx.createBiquadFilter();
        this.noiseBp.type = 'bandpass';
        this.noiseBp.Q.value = preset.noise.q;
        this.noiseBp.frequency.value = 220 * preset.noise.mult;
        this.noiseGain = ctx.createGain();
        this.noiseGain.gain.value = preset.noise.gain;
        this.noiseSrc.connect(this.noiseBp).connect(this.noiseGain).connect(this.filter);
        this.noiseSrc.start();
    }

    private retune(freq: number, glide: number) {
        const now = this.ctx.currentTime;
        this.freq = freq;
        for (let i = 0; i < this.oscs.length; i++) {
            ramp(this.oscs[i].frequency, freq * this.preset.oscs[i].harmonic, glide, now, true);
        }
        ramp(this.noiseBp.frequency, freq * this.preset.noise.mult, glide, now, true);
        this.updateFilter();
    }

    private updateFilter() {
        const p = this.preset.filter;
        const cutoff = clamp(
            (p.base + p.mult * this.freq) *
            (0.45 + this.intensity * 0.85) *
            this.preset.toneMult *
            Math.pow(3, this.toneBias),
            120,
            18000
        );
        this.filter.frequency.setTargetAtTime(cutoff, this.ctx.currentTime, 0.05);
    }

    setTone(bias: number) {
        this.toneBias = clamp(bias, -1, 1);
        this.updateFilter();
    }

    noteOn(freq: number, velocity: number) {
        const now = this.ctx.currentTime;
        this.retune(freq, 0);
        const e = this.preset.env;
        const peak = 0.3 + velocity * 0.7;
        this.vca.gain.cancelScheduledValues(now);
        this.vca.gain.setValueAtTime(this.vca.gain.value, now);
        this.vca.gain.linearRampToValueAtTime(peak, now + e.attack);
        this.vca.gain.linearRampToValueAtTime(peak * e.sustain, now + e.attack + e.decay);

        // A breath or bow attack pushes extra noise through, then settles.
        const n = this.preset.noise.gain;
        this.noiseGain.gain.cancelScheduledValues(now);
        this.noiseGain.gain.setValueAtTime(n * (1 + this.preset.chiff * 3), now);
        this.noiseGain.gain.setTargetAtTime(n, now + e.attack * 0.5, 0.09);
        this.gate = true;
    }

    setFrequency(freq: number, glide: number) {
        this.retune(freq, glide);
    }

    setIntensity(v: number) {
        this.intensity = v;
        this.out.gain.setTargetAtTime(this.preset.gain * Math.pow(v, 1.3), this.ctx.currentTime, 0.035);
        this.updateFilter();
    }

    setGamak(depth: number) {
        const now = this.ctx.currentTime;
        const cents = this.preset.vibrato.cents + depth * GAMAK_MAX_CENTS;
        this.lfoGain.gain.setTargetAtTime(cents, now, 0.05);
        this.lfo.frequency.setTargetAtTime((this.preset.vibrato.rate || 4.6) + depth * 3.4, now, 0.08);
    }

    setSustain(on: boolean) {
        this.sustain = on;
    }

    noteOff() {
        if (!this.gate) return;
        this.gate = false;
        const now = this.ctx.currentTime;
        this.vca.gain.cancelScheduledValues(now);
        this.vca.gain.setValueAtTime(this.vca.gain.value, now);
        // Sustain lets a wind or bowed voice taper away instead of stopping short.
        const release = this.preset.env.release * (this.sustain ? 2.6 : 1);
        this.vca.gain.linearRampToValueAtTime(0, now + release);
    }

    kill() {
        const now = this.ctx.currentTime;
        this.gate = false;
        this.vca.gain.cancelScheduledValues(now);
        this.vca.gain.setValueAtTime(this.vca.gain.value, now);
        this.vca.gain.linearRampToValueAtTime(0, now + 0.05);
    }

    dispose() {
        for (const o of this.oscs) {
            try {
                o.stop();
            } catch {
                /* already stopped */
            }
            o.disconnect();
        }
        try {
            this.noiseSrc.stop();
            this.lfo.stop();
        } catch {
            /* already stopped */
        }
        this.noiseSrc.disconnect();
        this.noiseBp.disconnect();
        this.noiseGain.disconnect();
        this.filter.disconnect();
        this.vca.disconnect();
        this.out.disconnect();
        this.lfoGain.disconnect();
    }
}

//-------the tanpura--

const TANPURA_PRESET: PluckedPreset = {
    kind: 'plucked',
    loopGain: 0.9991,
    damping: 0.34,
    jawari: 0.42,
    brightness: 0.3,
    position: 0.22,
    dampGain: 0.9,
    body: { freq: 165, gain: 7, q: 0.7 },
    sympathetic: 0,
    retrigger: false,
    glide: 0,
    gain: 0.42,
    toneMult: 0.62
};
class Tanpura {
    private strings: PluckedVoice[] = [];
    readonly out: GainNode;
    private freqs: number[] = [130, 261, 261, 130];
    private idx = 0;
    private timer: number | null = null;
    private running = false;
    private ctx: AudioContext;

    constructor(ctx: AudioContext) {
        this.ctx = ctx;
        this.out = ctx.createGain();
        this.out.gain.value = 0;
        for (let i = 0; i < 4; i++) {
            const v = new PluckedVoice(ctx, TANPURA_PRESET);
            v.setIntensity(0.85);
            v.out.connect(this.out);
            this.strings.push(v);
        }
    }
    setTuning(freqs: number[]) {
        this.freqs = freqs;
        for (let i = 0; i < this.strings.length; i++) {
            this.strings[i].setFrequency(freqs[i] ?? freqs[0], 0.25);
        }
    }
    private step = () => {
        if (!this.running) return;
        const s = this.strings[this.idx];

        s.noteOn(this.freqs[this.idx] ?? this.freqs[0], this.idx === 3 ? 0.95 : 0.7);
        this.idx = (this.idx + 1) % this.strings.length;
        this.timer = window.setTimeout(this.step, this.idx === 0 ? 1250 : 950);
    };
    setLevel(v: number) {
        this.out.gain.setTargetAtTime(v, this.ctx.currentTime, 0.25);

    }
    start(level: number) {
        if (this.running) {
            this.setLevel(level);
            return;

        }
        this.running = true;
        this.idx = 0;
        this.setLevel(level);
        this.step();
    }
    stop() {
        this.running = false;
        if (this.timer !== null) window.clearTimeout(this.timer);
        this.timer = null;
        this.setLevel(0);
    }
    get isRunning() {
        return this.running;
    }
    dispose() {
        this.stop();
        for (const s of this.strings) s.dispose();
        this.out.disconnect();
    }
}
//------------------------------------------
export interface EngineSettings {
    masterVolume: number;
    reverb: number;
    droneLevel: number;
}
/**
 * Owns the audio graph and exposes the small surface the gesture layer needs:
 * one melodic voice, a tanpura and a few global knobs
  */

export class SargamEngine {
    ctx: AudioContext;
    readonly analyser: AnalyserNode;

    private melodyBus: GainNode;
    private sympIn: GainNode;
    private sympOut: GainNode;
    private sympFilters: BiquadFilterNode[] = [];
    private mix: GainNode;
    private dry: GainNode;
    private wet: GainNode;
    private convolver: ConvolverNode;
    private comp: DynamicsCompressorNode;
    private master: GainNode;
    private noiseBuffer: AudioBuffer;

    private voice: VoiceCommon | null = null;
    private tanpura: Tanpura;
    private instrument: Instrument;
    private ready = false;

    private currentFreq = 0;
    private sounding = false;
    private constructor(ctx: AudioContext) {
        this.ctx = ctx;
        this.instrument = instrumentById('sitar');
        this.noiseBuffer = makeNoiseBuffer(ctx);

        this.melodyBus = ctx.createGain();
        this.sympIn = ctx.createGain();
        this.sympOut = ctx.createGain();
        this.sympOut.gain.value = 0;
        this.mix = ctx.createGain();
        this.dry = ctx.createGain();
        this.wet = ctx.createGain();
        this.wet.gain.value = 0.28;
        this.dry.gain.value = 1;
        this.convolver = ctx.createConvolver();
        this.convolver.buffer = makeReverbIR(ctx, 2.6, 2.4);

        this.comp = ctx.createDynamicsCompressor();
        this.comp.threshold.value = -14;
        this.comp.knee.value = 12;
        this.comp.ratio.value = 4;
        this.comp.attack.value = 0.005;
        this.comp.release.value = 0.2;

        this.master = ctx.createGain();
        this.master.gain.value = 0.85;
        this.analyser = ctx.createAnalyser();
        this.analyser.fftSize = 1024;
        this.analyser.smoothingTimeConstant = 0.75;
        // Around 16 high q resonators standing in for a sitars tarab strings they ring and whenever the melody passes near their pitcch...
        for (let i = 0; i < 16; i++) {
            const bp = ctx.createBiquadFilter();
            bp.type = 'bandpass';
            bp.Q.value = 55;
            bp.frequency.value = 200 + i * 40;
            this.sympIn.connect(bp).connect(this.sympOut);
            this.sympFilters.push(bp);
        }
        this.tanpura = new Tanpura(ctx);
        this.melodyBus.connect(this.mix);
        this.melodyBus.connect(this.sympIn);
        this.sympOut.connect(this.mix);
        this.tanpura.out.connect(this.mix);
        this.tanpura = new Tanpura(ctx);
        this.melodyBus.connect(this.mix);
        this.melodyBus.connect(this.sympIn);
        this.sympOut.connect(this.mix);
        this.tanpura.out.connect(this.mix);
        this.mix.connect(this.dry).connect(this.comp);
        this.mix.connect(this.convolver).connect(this.wet).connect(this.comp);
        this.comp.connect(this.master).connect(this.analyser);
        this.analyser.connect(ctx.destination);
    }
    static async create(): Promise<SargamEngine> {
        const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new Ctor({ latencyHint: 'interactive' });
        await ctx.audioWorklet.addModule(workletUrl);
        const engine = new SargamEngine(ctx);

        engine.ready = true;
        engine.setInstrument('sitar');
        await ctx.resume();
        return engine;
    }
    get instrumentId() {
        return this.instrument.id;
    }

    get preset() {
        return this.instrument.preset;

    }
    async resume() {
        if (this.ctx.state !== 'running') await this.ctx.resume();
    }
    setInstrument(id: string) {
        if (!this.ready) return;
        const next = instrumentById(id);
        if (this.voice && next.id === this.instrument.id) return;
        const old = this.voice;
        this.instrument = next;
        this.sounding = false;

        const v: VoiceCommon =
            next.preset.kind === 'plucked'
                ? new PluckedVoice(this.ctx, next.preset)
                : new SustainedVoice(this.ctx, next.preset as SustainedPreset, this.noiseBuffer);
        v.out.connect(this.melodyBus);
        this.voice = v;

        const symp = next.preset.kind === 'plucked' ? (next.preset as PluckedPreset).sympathetic : 0.12;
        this.sympOut.gain.setTargetAtTime(symp * 0.16, this.ctx.currentTime, 0.1);
        if (old) {
            old.kill();
            // Let the old voices tail finish before tearing it down...
            window.setTimeout(() => old.dispose(), 900);
        }
    }
    /** Retune the sympathetic resonators to the swaras of the current raga. */
    setSympatheticTuning(freqs: number[]) {
        const now = this.ctx.currentTime;
        for (let i = 0; i < this.sympFilters.length; i++) {
            const f = freqs[i % freqs.length] * (i < freqs.length ? 1 : 2);
            this.sympFilters[i].frequency.setTargetAtTime(clamp(f, 60, 8000), now, 0.2);
        }
    }
    noteOn(freq: number, velocity: number) {
        if (!this.voice) return;
        this.currentFreq = freq;
        this.sounding = true;
        this.voice.noteOn(freq, velocity);
    }

    /**SLIDE THE SOUNDING NOTE.'glide' of 0 snaps; larger values are meant to create a smooth glide. */
    restrike(freq: number, velocity: number) {
        if (!this.voice) return;
        this.currentFreq = freq;
        this.voice.noteOn(freq, velocity);
    }

    /** Glide the sounding note to a new frequency. 'glide' of 0 snaps; larger values create a smooth slide. */
    setFrequency(freq: number, glide: number) {
        if (!this.voice) return;
        this.currentFreq = freq;
        this.voice.setFrequency(freq, glide);
    }

    setIntensity(v: number) {
        this.voice?.setIntensity(clamp(v, 0, 1));
    }

    setTone(bias: number) {
        this.voice?.setTone(bias);
    }
    setSustain(on: boolean) {
        this.voice?.setSustain(on);
    }
    setGamak(depth: number) {
        this.voice?.setGamak(clamp(depth, 0, 1));
    }
    noteOff() {
        if (!this.sounding) return;
        this.sounding = false;
        this.voice?.noteOff();
    }
    /**THE FIRST gesture: hand flat on the strings everything stops */

    dampAll() {
        this.sounding = false;
        this.voice?.kill();
    }

    get isSounding() {
        return this.sounding;
    }

    setDrone(on: boolean, level: number) {
        if (on) this.tanpura.start(level);
        else this.tanpura.stop();
    }

    setDroneLevel(level: number) {
        if (this.tanpura.isRunning) this.tanpura.setLevel(level);
    }

    get droneOn() {
        return this.tanpura.isRunning;
    }

    setDroneTuning(freqs: number[]) {
        this.tanpura.setTuning(freqs);
    }
    applySettings(s: EngineSettings) {
        const now = this.ctx.currentTime;
        this.master.gain.setTargetAtTime(s.masterVolume, now, 0.05);
        this.wet.gain.setTargetAtTime(s.reverb, now, 0.1);
        this.setDroneLevel(s.droneLevel);
    }
    dispose() {
        this.voice?.dispose();
        this.tanpura.dispose();
        void this.ctx.close();
    }
}