/**
 * Finger poses to scale degrees.
 *
 * The counting scheme follows Eric Wei's Gesture Synth: one to five extended
 * digits give the first five degrees, then two dedicated shapes extend the
 * reach to seven without asking for six- or seven-finger counts. Left hand
 * chooses the note; that is the whole instrument in one hand.
 */

export type FingerState = [boolean, boolean, boolean, boolean, boolean];
export const NO_FINGERS: FingerState = [false, false, false, false, false];

export function poseToDegree(f: FingerState): number | null {
    const [thumb, index, middle, ring, pinky] = f;

    if (index && pinky && !middle && !ring) return thumb ? 6 : 5;
    const count = f.filter(Boolean).length;
    if (count >= 1 && count <= 5) return count - 1;
    return null;
}

export const DEGREE_POSES: FingerState[] = [
    [false, true, false, false, false], // 1 — Sa
    [false, true, true, false, false], // 2 — Re
    [false, true, true, true, false], // 3 — Ga
    [false, true, true, true, true], // 4 — Ma
    [true, true, true, true, true], // 5 — Pa
    [false, true, false, false, true], // index + pinky — Dha
    [true, true, false, false, true], // + thumb — Ni
];
export type Articulation = 'mute' | 'murki' | 'jhala' | 'andolan' | 'plain';
export const ARTICULATIONS: { count: number; id: Articulation; name: string; note: string }[] = [
    { count: 0, id: 'mute', name: 'Mute', note: 'Fist — palm on the strings' },
    { count: 1, id: 'murki', name: 'Murki', note: 'A fast flick against the next swara' },
    { count: 2, id: 'jhala', name: 'Jhala', note: 'Rapid repeated strokes' },
    { count: 3, id: 'andolan', name: 'Andolan', note: 'Deep, slow oscillation of the swara' },
    { count: 4, id: 'plain', name: 'Plain', note: 'Open hand — the swara, unornamented' },
];
export function articulationFor(fingersUp: number): Articulation {
    return ARTICULATIONS[Math.max(0, Math.min(4, fingersUp))].id;
}
