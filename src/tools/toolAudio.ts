let ctx: AudioContext | null = null;

export function audio(): AudioContext {
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
}

export const NOTE_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];

/** Western name of a semitone offset above a named tonic, e.g. (D, 3) -> F. */
export function transposeName(tonicName: string, semitones: number): string {
    const root = NOTE_NAMES.indexOf(tonicName);
    if (root < 0) return '';
    return NOTE_NAMES[(root + ((semitones % 12) + 12)) % 12];
}

/** Nearest equal-tempered note name, octave, and how far off in cents. */
export function nearestNote(hz: number): { name: string; octave: number; cents: number } {
    const midi = 69 + 12 * Math.log2(hz / 440);
    const rounded = Math.round(midi);
    return {
        name: NOTE_NAMES[((rounded % 12) + 12) % 12],
        octave: Math.floor(rounded / 12) - 1,
        cents: Math.round((midi - rounded) * 100),
    };
}

export function playNote(hz: number, seconds = 0.9, gain = 0.22, when = 0) {
    const ac = audio();
    const t = ac.currentTime + when;

    const amp = ac.createGain();
    amp.gain.setValueAtTime(0, t);
    amp.gain.linearRampToValueAtTime(gain, t + 0.012);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + seconds);

    const tone = ac.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.setValueAtTime(Math.min(9000, hz * 9), t);
    tone.frequency.exponentialRampToValueAtTime(Math.max(400, hz * 2.2), t + seconds);
    tone.Q.value = 0.8;

    tone.connect(amp).connect(ac.destination);

    for (const [type, detune, level] of [
        ['triangle', 0, 1],
        ['sawtooth', 6, 0.32],
    ] as const) {
        const osc = ac.createOscillator();
        osc.type = type;
        osc.frequency.value = hz;
        osc.detune.value = detune;
        const g = ac.createGain();
        g.gain.value = level;
        osc.connect(g).connect(tone);
        osc.start(t);
        osc.stop(t + seconds + 0.05);
    }
}
export function playClick(hz: number, gain = 0.5, at?: number) {
    const ac = audio();
    const t = at ?? ac.currentTime;
    const amp = ac.createGain();
    amp.gain.setValueAtTime(gain, t);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    amp.connect(ac.destination);

    const osc = ac.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(hz, t);
    osc.frequency.exponentialRampToValueAtTime(hz * 0.6, t + 0.06);

    const shape = ac.createBiquadFilter();
    shape.type = 'bandpass';
    shape.frequency.value = hz;
    shape.Q.value = 1.4;

    osc.connect(shape).connect(amp);
    osc.start(t);
    osc.stop(t + 0.09);
}
export interface Drone {
    setLevel(v: number): void;
    stop(): void;
}
export function startDrone(freqs: number[], level = 0.16): Drone {
    const ac = audio();
    const t = ac.currentTime;

    const out = ac.createGain();
    out.gain.setValueAtTime(0, t);
    out.gain.linearRampToValueAtTime(level, t + 0.6);

    const tone = ac.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 1600;
    tone.Q.value = 0.7;
    tone.connect(out).connect(ac.destination);

    const parts: OscillatorNode[] = [];
    freqs.forEach((hz, i) => {
