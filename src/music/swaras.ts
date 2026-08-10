export type SwaraId =
    | 'S'
    | 'r'
    | 'R'
    | 'g'
    | 'G'
    | 'm'
    | 'M'
    | 'P'
    | 'd'
    | 'D'
    | 'n'
    | 'N';

export interface Swara {
    id: SwaraId;
    semitone: number;
    roman: string;
    devanagari: string;
    full: string;
    variant: 'shuddha' | 'komal' | 'tivra';
}

export const SWARAS: Swara[] = [
    { id: 'S', semitone: 0, roman: 'Sa', devanagari: 'सा', full: 'Shadja', variant: 'shuddha' },
    { id: 'r', semitone: 1, roman: 'Re', devanagari: 'रे', full: 'Komal Rishabh', variant: 'komal' },
    { id: 'R', semitone: 2, roman: 'Re', devanagari: 'रे', full: 'Shuddha Rishabh', variant: 'shuddha' },
    { id: 'g', semitone: 3, roman: 'Ga', devanagari: 'ग', full: 'Komal Gandhar', variant: 'komal' },
    { id: 'G', semitone: 4, roman: 'Ga', devanagari: 'ग', full: 'Shuddha Gandhar', variant: 'shuddha' },
    { id: 'm', semitone: 5, roman: 'Ma', devanagari: 'म', full: 'Shuddha Madhyam', variant: 'shuddha' },
    { id: 'M', semitone: 6, roman: 'Ma', devanagari: 'म', full: 'Tivra Madhyam', variant: 'tivra' },
    { id: 'P', semitone: 7, roman: 'Pa', devanagari: 'प', full: 'Pancham', variant: 'shuddha' },
    { id: 'd', semitone: 8, roman: 'Dha', devanagari: 'ध', full: 'Komal Dhaivat', variant: 'komal' },
    { id: 'D', semitone: 9, roman: 'Dha', devanagari: 'ध', full: 'Shuddha Dhaivat', variant: 'shuddha' },
    { id: 'n', semitone: 10, roman: 'Ni', devanagari: 'नि', full: 'Komal Nishad', variant: 'komal' },
    { id: 'N', semitone: 11, roman: 'Ni', devanagari: 'नि', full: 'Shuddha Nishad', variant: 'shuddha' },
];

const BY_SEMITONE = new Map(SWARAS.map((s) => [s.semitone, s]));

export function swaraAt(semitone: number): Swara {
    const s = BY_SEMITONE.get(((semitone % 12) + 12) % 12);
    if (!s) throw new Error(`no swara for semitone ${semitone}`);
    return s;
}

export const JUST_RATIOS: number[] = [
    1 / 1, // Sa
    16 / 15, // komal Re
    9 / 8, // shuddha Re
    6 / 5, // komal Ga
    5 / 4, // shuddha Ga
    4 / 3, // shuddha Ma
    45 / 32, // tivra Ma
    3 / 2, // Pa
    8 / 5, // komal Dha
    5 / 3, // shuddha Dha
    16 / 9, // komal Ni
    15 / 8, // shuddha Ni
];

export type Tuning = 'just' | 'equal';

/** Frequency of a semitone offset above a given Sa, in the chosen tuning. */
export function pitchOf(saHz: number, semitone: number, tuning: Tuning): number {
    const octave = Math.floor(semitone / 12);
    const within = semitone - octave * 12;
    const base = saHz * Math.pow(2, octave);
    return tuning === 'just' ? base * JUST_RATIOS[within] : base * Math.pow(2, within / 12);
}