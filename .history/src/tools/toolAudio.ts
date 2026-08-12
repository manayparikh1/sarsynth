let ctx: AudioContext | null = null;
export function audio(): AudioContext {
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
}

export const NOTE_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];

export function transpose(tonicName: string, semitones: number): string {
    const root = NOTE_NAMES.indexOf(tonicName);
    if (root < 0) return '';
    return NOTE_NAMES[(root + ((semitones % 12) + 12)) % 12];
}

export function transposeName(tonicName: string, semitones: number): string {
    const root = NOTE_NAMES.indexOf(tonicName);
    if (root < 0) return '';
    return NOTE_NAMES[(root + ((semitones % 12) + 12)) % 12];
}
export function nearestNote(hz: number): { name: string; octave: number; cents: number } {
    const midi = 69 + 12 * Math.log2(hz / 440);
    const rounded = Math.round(midi);
    return {
        name: NOTE_NAMES[((rounded % 12) + 12) % 12],
        octave: Math.floor(rounded / 12) - 1,
        cents: Math.round((midi - rounded) * 100),
    };
}
