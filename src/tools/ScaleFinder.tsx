import { useMemo, useState } from 'react';
import { SCALES, TONICS, type Scale } from '../music/ragas';
import { pitchOf, swaraAt } from '../music/swaras';
import { playNote, transposeName } from './toolAudio';
import { Segmented, ToolShell, TonicPicker } from './ToolChrome';

type Match = 'contains' | 'exact';

const GROUP_LABEL: Record<Scale['group'], string> = {
    thaat: 'thaat',
    raga: 'raga',
    western: 'western',
};

export function ScaleFinder({ onBack }: { onBack: () => void }) {
    const [tonicIdx, setTonicIdx] = useState(0);
    const [picked, setPicked] = useState<number[]>([0, 4, 7]);
    const [match, setMatch] = useState<Match>('contains');

    const tonic = TONICS[tonicIdx];
    const saHz = tonic.hz;

    const toggle = (semi: number) =>
        setPicked((cur) =>
            cur.includes(semi) ? cur.filter((s) => s !== semi) : [...cur, semi].sort((a, b) => a - b)
        );

    const results = useMemo(() => {
        const scored = SCALES.filter((s) =>
            match === 'exact'
                ? s.semitones.length === picked.length && picked.every((p) => s.semitones.includes(p))
                : picked.every((p) => s.semitones.includes(p))
        ).map((s) => ({ scale: s, extra: s.semitones.length - picked.length }));
        // Tightest fit first, then thaats before ragas before western shapes.
        const order: Scale['group'][] = ['thaat', 'raga', 'western'];
        return scored.sort(
            (a, b) =>
                a.extra - b.extra ||
                order.indexOf(a.scale.group) - order.indexOf(b.scale.group) ||
                a.scale.name.localeCompare(b.scale.name)
        );
    }, [picked, match]);

    const playScale = (scale: Scale) => {
        const run = [...scale.semitones, 12];
        run.forEach((semi, i) => playNote(pitchOf(saHz, semi, 'just'), 0.7, 0.2, i * 0.26));
    };

    return (
        <ToolShell
            deva="खोज"
            title="Scale & raga finder"
            blurb="Tap the notes you already know — from a melody you are working out, or a phrase stuck in your head — and see which thaats, ragas and western scales they fit inside."
            onBack={onBack}
        >
            <div className="tool-row">
                <TonicPicker value={tonicIdx} onChange={setTonicIdx} />
                <Segmented
                    value={match}
                    onChange={setMatch}
                    options={[
                        { id: 'contains', label: 'Contains my notes' },
                        { id: 'exact', label: 'Exact match only' },
                    ]}
                />
                <button className="ghost tool-btn" onClick={() => setPicked([])}>
                    Clear
                </button>
            </div>

            <div className="keyrow">
                {Array.from({ length: 12 }, (_, semi) => {
                    const swara = swaraAt(semi);
                    const on = picked.includes(semi);
                    return (
                        <button
                            key={semi}
                            className={`keycell${on ? ' on' : ''} ${swara.variant}`}

                            onClick={() => {
                                toggle(semi);
                                playNote(pitchOf(saHz, semi, 'just'), 0.7, 0.2);
                            }}
                        >

                            <span className="keycell-deva">{swara.devanagari}</span>
                            <span className="keycell-roman">{swara.roman}</span>
                            <span className="keycell-west">{transposeName(tonic.name, semi)}</span>
                        </button>
                    );
                })}
            </div>

            <p className="tool-note">
                {picked.length === 0
                    ? 'Nothing selected...every scale in the app is listed below !!!'
                    : `${picked.length} note${picked.length === 1 ? '' : 's'} selected · ${results.length} match${results.length === 1 ? '' : 'es'}`}
            </p>

            <div className="result-list">
                {results.map(({ scale, extra }) => (
                    <div className="result" key={scale.id}>
                        <div className="result-top">
                            <span className="result-name">{scale.name}</span>
                            <span className="tag">{GROUP_LABEL[scale.group]}</span>
                            <span className="result-fit">
                                {extra === 0 ? 'exact fit' : `+${extra} more note${extra === 1 ? '' : 's'}`}
                            </span>
                            <button

                                className="icon result-play"
                                onClick={() => playScale(scale)}
                                aria-label={`Play ${scale.name}`}
                            >
                                ▶
                            </button>
                        </div>
                        <div className="result-swaras">
                            {scale.semitones.map((semi) => {
                                const swara = swaraAt(semi);
                                return (
                                    <span
                                        key={semi}
                                        className={`swara-chip ${swara.variant}${picked.includes(semi) ? ' hit' : ''}`}
                                    >
                                        {swara.roman}
                                    </span>
                                );
                            })}
                        </div>
                        {scale.note && <p className="result-note">{scale.note}</p>}
                    </div>
                ))}
                {results.length === 0 && (
                    <p className="tool-note">
                        No scale in the app holds all of those together. Drop a note and try again — that
                        combination may be a raga that bends a swara rather than one that spells it out.
                    </p>
                )}
            </div>
        </ToolShell>
    );
}