
export interface PluckedPreset {
    kind: 'plucked';
    loopGain: number;
    damping: number;
    jawari: number;
    brightness: number;
    position: number;
    dampGain: number;

    body: { freq: number; gain: number; q: number };
    sympathetic: number;
    retrigger: boolean;
    glide: number;
    gain: number;
    toneMult: number;
}

export interface SustainedPreset {
    kind: 'sustained';
    oscs: { type: OscillatorType; harmonic: number; detune: number; gain: number }[];
    noise: { gain: number; mult: number; q: number };
    chiff: number;
    filter: { base: number; mult: number; q: number };
    formants: { freq: number; gain: number; q: number }[];
    env: { attack: number; decay: number; sustain: number; release: number };
    vibrato: { rate: number; cents: number };
    glide: number;
    retrigger: boolean;
    gain: number;
    toneMult: number;
}

export type Preset = PluckedPreset | SustainedPreset;

export interface Instrument {
    id: string;
    name: string;
    family: string;
    preset: Preset;
}

export const INSTRUMENTS: Instrument[] = [
    {
        id: 'sitar',
        name: 'Sitar',
        family: 'Plucked',
        preset: {
            kind: 'plucked',
            loopGain: 0.9994,
            damping: 0.44,
            jawari: 0.5,
            brightness: 0.6,
            position: 0.22,
            dampGain: 0.9,
            body: { freq: 190, gain: 8, q: 0.7 },
            sympathetic: 0.55,
            retrigger: false,
            glide: 0.11,
            gain: 2.25,
            toneMult: 1,
        },
    },
    {
        id: 'sarod',
        name: 'Sarod',
        family: 'Plucked',
        preset: {
            kind: 'plucked',
            loopGain: 0.9986,
            damping: 0.52,
            jawari: 0.2,
            brightness: 0.52,
            position: 0.25,
            dampGain: 0.86,
            body: { freq: 240, gain: 7, q: 0.8 },
            sympathetic: 0.35,
            retrigger: false,
            // A fretless steel fingerboard is what makes sarod meend so long.
            glide: 0.16,
            gain: 2.5,
            toneMult: 0.8,
        },
    },
    {
        id: 'veena',
        name: 'Veena',
        family: 'Plucked',
        preset: {
            kind: 'plucked',
            loopGain: 0.9992,
            damping: 0.48,
            jawari: 0.26,
            brightness: 0.46,
            position: 0.24,
            dampGain: 0.88,
            body: { freq: 175, gain: 8, q: 0.7 },
            sympathetic: 0.3,
            retrigger: false,
            glide: 0.13,
            gain: 1.85,
            toneMult: 0.85,
        },
    },
    {
        id: 'santoor',
        name: 'Santoor',
        family: 'Struck',
        preset: {
            kind: 'plucked',
            loopGain: 0.9965,
            damping: 0.34,
            jawari: 0.04,
            brightness: 0.66,
            position: 0.3,
            dampGain: 0.8,
            // Struck with mallets, so every swara is a fresh strike.
            body: { freq: 300, gain: 5, q: 0.9 },
            sympathetic: 0.22,
            retrigger: true,
            glide: 0.02,
            gain: 1.78,
            toneMult: 1.25,
        },
    },
    {
        id: 'bansuri',
        name: 'Bansuri',
        family: 'Wind',
        preset: {
            kind: 'sustained',
            oscs: [
                { type: 'sine', harmonic: 1, detune: 0, gain: 1 },
                { type: 'sine', harmonic: 2, detune: 0, gain: 0.2 },
                { type: 'triangle', harmonic: 3, detune: 4, gain: 0.07 },
            ],
            noise: { gain: 0.14, mult: 2.6, q: 1.4 },
            chiff: 0.5,
            filter: { base: 320, mult: 4, q: 0.9 },
            formants: [{ freq: 850, gain: 4, q: 2 }],
            env: { attack: 0.09, decay: 0.14, sustain: 0.86, release: 0.24 },
            vibrato: { rate: 5.2, cents: 11 },
            glide: 0.09,
            retrigger: false,
            gain: 0.52,
            toneMult: 1,
        },
    },
    {
        id: 'shehnai',
        name: 'Shehnai',
        family: 'Reed',
        preset: {
            kind: 'sustained',
            oscs: [
                { type: 'sawtooth', harmonic: 1, detune: -5, gain: 0.5 },
                { type: 'sawtooth', harmonic: 1, detune: 6, gain: 0.5 },
            ],
            noise: { gain: 0.05, mult: 3.2, q: 2 },
            chiff: 0.25,
            filter: { base: 220, mult: 6, q: 3 },
            // Three peaks bunched in the upper mids give the double reed its nasal cry.
            formants: [
                { freq: 720, gain: 9, q: 6 },
                { freq: 1450, gain: 7, q: 8 },
                { freq: 2700, gain: 6, q: 7 },
            ],
            env: { attack: 0.05, decay: 0.09, sustain: 0.9, release: 0.16 },
            vibrato: { rate: 6, cents: 9 },
            glide: 0.08,
            retrigger: false,
            gain: 0.41,
            toneMult: 1.1,
        },
    },
    {
        id: 'sarangi',
        name: 'Sarangi',
        family: 'Bowed',
        preset: {
            kind: 'sustained',
            oscs: [
                { type: 'sawtooth', harmonic: 1, detune: -6, gain: 0.55 },
                { type: 'sawtooth', harmonic: 1, detune: 7, gain: 0.45 },
                { type: 'triangle', harmonic: 2, detune: 0, gain: 0.12 },
            ],
            noise: { gain: 0.11, mult: 3.5, q: 2.2 },
            chiff: 0.35,
            filter: { base: 190, mult: 5, q: 5 },
            // Formants near human vowel positions — the sarangi imitates the voice.
            formants: [
                { freq: 460, gain: 6, q: 4 },
                { freq: 1150, gain: 5, q: 5 },
                { freq: 2450, gain: 3.5, q: 6 },
            ],
            env: { attack: 0.13, decay: 0.18, sustain: 0.9, release: 0.3 },
            vibrato: { rate: 5.5, cents: 14 },
            glide: 0.14,
            retrigger: false,
            gain: 0.4,
            toneMult: 0.95,
        },
    },
    {
        id: 'harmonium',
        name: 'Harmonium',
        family: 'Reed',
        preset: {
            kind: 'sustained',
            oscs: [
                { type: 'sawtooth', harmonic: 1, detune: -9, gain: 0.35 },
                { type: 'square', harmonic: 1, detune: 9, gain: 0.22 },
                { type: 'sawtooth', harmonic: 2, detune: 0, gain: 0.14 },
            ],
            noise: { gain: 0.03, mult: 2, q: 1.5 },
            chiff: 0.15,
            filter: { base: 420, mult: 3, q: 1 },
            formants: [{ freq: 950, gain: 4, q: 3 }],
            env: { attack: 0.025, decay: 0.05, sustain: 1, release: 0.09 },
            // Free reeds have no vibrato and no glide — bellows pressure is all you get.
            vibrato: { rate: 0, cents: 0 },
            glide: 0.008,
            retrigger: true,
            gain: 0.78,
            toneMult: 1,
        },
    },
];

export const INSTRUMENTS_BY_ID = new Map(INSTRUMENTS.map((i) => [i.id, i]));

export function instrumentById(id: string): Instrument {
    return INSTRUMENTS_BY_ID.get(id) ?? INSTRUMENTS[0];
}
