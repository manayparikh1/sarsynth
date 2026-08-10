//- Acknowledgements in research: claude researched all the raags and scales which sped up the amount of time I used so thank you to claude.


export type ScaleGroup = 'thaat' | 'raga' | 'western';

export interface Scale {
    id: string;
    name: string;
    group: ScaleGroup;
    /** Ascending semitone offsets above Sa, always starting at 0. */
    semitones: number[];
    /** Short note on time of day / character. */
    note: string;
}

export const SCALES: Scale[] = [
    // ---- The ten thaats -------------------------------------------------
    { id: 'bilawal', name: 'Bilawal', group: 'thaat', semitones: [0, 2, 4, 5, 7, 9, 11], note: 'All shuddha swaras — the natural major' },
    { id: 'khamaj', name: 'Khamaj', group: 'thaat', semitones: [0, 2, 4, 5, 7, 9, 10], note: 'Komal Ni — light, romantic' },
    { id: 'kafi', name: 'Kafi', group: 'thaat', semitones: [0, 2, 3, 5, 7, 9, 10], note: 'Komal Ga and Ni — dorian, pastoral' },
    { id: 'asavari', name: 'Asavari', group: 'thaat', semitones: [0, 2, 3, 5, 7, 8, 10], note: 'Komal Ga, Dha, Ni — late morning, grave' },
    { id: 'bhairavi', name: 'Bhairavi', group: 'thaat', semitones: [0, 1, 3, 5, 7, 8, 10], note: 'All komal — devotional, closes a concert' },
    { id: 'bhairav', name: 'Bhairav', group: 'thaat', semitones: [0, 1, 4, 5, 7, 8, 11], note: 'Komal Re and Dha — dawn, austere' },
    { id: 'kalyan', name: 'Kalyan', group: 'thaat', semitones: [0, 2, 4, 6, 7, 9, 11], note: 'Tivra Ma — early evening, serene' },
    { id: 'marwa', name: 'Marwa', group: 'thaat', semitones: [0, 1, 4, 6, 7, 9, 11], note: 'Komal Re, tivra Ma — sunset, unsettled' },
    { id: 'purvi', name: 'Purvi', group: 'thaat', semitones: [0, 1, 4, 6, 7, 8, 11], note: 'Komal Re and Dha, tivra Ma — dusk' },
    { id: 'todi', name: 'Todi', group: 'thaat', semitones: [0, 1, 3, 6, 7, 8, 11], note: 'Komal Re, Ga, Dha, tivra Ma — morning, intense' },
    // ----  ragas -----------------------------------------------------
    { id: 'yaman', name: 'Yaman', group: 'raga', semitones: [0, 2, 4, 6, 7, 9, 11], note: 'Evening. The raga most students learn first' },
    { id: 'bhupali', name: 'Bhupali', group: 'raga', semitones: [0, 2, 4, 7, 9], note: 'Evening pentatonic — no Ma, no Ni. Calm, wide' },
    { id: 'malkauns', name: 'Malkauns', group: 'raga', semitones: [0, 3, 5, 8, 10], note: 'Midnight pentatonic — no Re, no Pa. Dark, meditative' },
    { id: 'durga', name: 'Durga', group: 'raga', semitones: [0, 2, 5, 7, 9], note: 'Night pentatonic — no Ga, no Ni. Open, folk-like' },
    { id: 'hamsadhwani', name: 'Hamsadhwani', group: 'raga', semitones: [0, 2, 4, 7, 11], note: 'Carnatic import — bright, celebratory openers' },
    { id: 'shivaranjani', name: 'Shivaranjani', group: 'raga', semitones: [0, 2, 3, 7, 9], note: 'Night pentatonic with komal Ga — wistful' },
    { id: 'madhmad_sarang', name: 'Madhmad Sarang', group: 'raga', semitones: [0, 2, 5, 7, 10], note: 'Midday — no Ga, no Dha. Bright and direct' },
    { id: 'bageshri', name: 'Bageshri', group: 'raga', semitones: [0, 2, 3, 5, 9, 10], note: 'Late night — Pa nearly absent. Longing' },
    { id: 'darbari', name: 'Darbari Kanada', group: 'raga', semitones: [0, 2, 3, 5, 7, 8, 10], note: 'Late night — heavy oscillation on komal Ga and Dha' },
    { id: 'ahir_bhairav', name: 'Ahir Bhairav', group: 'raga', semitones: [0, 1, 4, 5, 7, 9, 10], note: 'Morning — komal Re with komal Ni. Tender' },
    { id: 'bhimpalasi', name: 'Bhimpalasi', group: 'raga', semitones: [0, 2, 3, 5, 7, 9, 10], note: 'Afternoon — komal Ga and Ni. Yearning' },
    { id: 'kirwani', name: 'Kirwani', group: 'raga', semitones: [0, 2, 3, 5, 7, 8, 11], note: 'Harmonic-minor shape — dramatic, popular in fusion' },
    { id: 'charukeshi', name: 'Charukeshi', group: 'raga', semitones: [0, 2, 4, 5, 7, 8, 10], note: 'Bright below, plaintive above — bittersweet' },
    { id: 'jog', name: 'Jog', group: 'raga', semitones: [0, 4, 5, 7, 10], note: 'Night — no Re, no Dha. Bold, blues-adjacent' },
    { id: 'desh', name: 'Desh', group: 'raga', semitones: [0, 2, 4, 5, 7, 9, 10], note: 'Monsoon raga — Khamaj family, buoyant' },
    { id: 'puriya_dhanashri', name: 'Puriya Dhanashri', group: 'raga', semitones: [0, 1, 4, 6, 7, 8, 11], note: 'Sunset — Purvi family, deeply serious' },

    //--western scales---

    { id: 'major', name: 'Major (Ionian)', group: 'western', semitones: [0, 2, 4, 5, 7, 9, 11], note: '' },
    { id: 'natural_minor', name: 'Natural Minor', group: 'western', semitones: [0, 2, 3, 5, 7, 8, 10], note: '' },
    { id: 'harmonic_minor', name: 'Harmonic Minor', group: 'western', semitones: [0, 2, 3, 5, 7, 8, 11], note: '' },
    { id: 'dorian', name: 'Dorian', group: 'western', semitones: [0, 2, 3, 5, 7, 9, 10], note: '' },
    { id: 'mixolydian', name: 'Mixolydian', group: 'western', semitones: [0, 2, 4, 5, 7, 9, 10], note: '' },
    { id: 'phrygian_dominant', name: 'Phrygian Dominant', group: 'western', semitones: [0, 1, 4, 5, 7, 8, 10], note: '' },
    { id: 'major_pentatonic', name: 'Major Pentatonic', group: 'western', semitones: [0, 2, 4, 7, 9], note: '' },
    { id: 'minor_pentatonic', name: 'Minor Pentatonic', group: 'western', semitones: [0, 3, 5, 7, 10], note: '' },
    { id: 'blues', name: 'Blues', group: 'western', semitones: [0, 3, 5, 6, 7, 10], note: '' },
    { id: 'whole_tone', name: 'Whole Tone', group: 'western', semitones: [0, 2, 4, 6, 8, 10], note: '' },
    { id: 'chromatic', name: 'Chromatic', group: 'western', semitones: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], note: '' },
];
export const SCALES_BY_ID = new Map(SCALES.map((s) => [s.id, s]));

export function scaleById(id: string): Scale {
    return SCALES_BY_ID.get(id) ?? SCALES[0];
}

export function tanpuraSemitones(scale: Scale): number[] {
    const has = (n: number) => scale.semitones.includes(n);
    let companion: number;
    if (has(7)) companion = 7 - 12; // Pa below Sa
    else if (has(5)) companion = 5 - 12; // Ma below Sa
    else if (has(11)) companion = 11 - 12; // Ni below Sa
    else if (has(10)) companion = 10 - 12; // komal Ni below Sa
    else companion = -12; // nothing suitable: double the lower Sa
    return [companion, 0, 0, -12];
}

//-sa tonic choices 

export interface Tonic {
    name: string;
    marking: string;
    hz: number;
}
//Tonic hertz got from my flutes using a simple tuner.
export const TONICS: Tonic[] = [
    { name: 'C', marking: 'Safed 1', hz: 261.63 },
    { name: 'C♯', marking: 'Kali 1', hz: 277.18 },
    { name: 'D', marking: 'Safed 2', hz: 293.66 },
    { name: 'D♯', marking: 'Kali 2', hz: 311.13 },
    { name: 'E', marking: 'Safed 3', hz: 329.63 },
    { name: 'F', marking: 'Safed 4', hz: 349.23 },
    { name: 'F', marking: 'Safed 4', hz: 349.23 },
    { name: 'F♯', marking: 'Kali 3', hz: 369.99 },
    { name: 'G', marking: 'Safed 5', hz: 392.0 },
    { name: 'G♯', marking: 'Kali 4', hz: 415.3 },
    { name: 'A', marking: 'Safed 6', hz: 440.0 },
    { name: 'A♯', marking: 'Kali 5', hz: 466.16 },
    { name: 'B', marking: 'Safed 7', hz: 493.88 },
];

/**
 * Sa is placed an octave below the listing frequenct so that the madhya saptak sits in a comfortable singing range and taar saptak stays under -1 kHz
 */


export const SA_OCTAVE_SHIFT = -1;
