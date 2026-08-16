import { useEffect, useRef, useState } from 'react';
import { SCALES, TONICS, scaleById } from '../music/ragas';
import { pitchOf, swaraAt } from '../music/swaras';
import { playNote } from './toolAudio';
import { ToolShell, TonicPicker } from './ToolChrome';

export function EarTrainer({ onBack }: { onBack: () => void }) {
    const [tonicIdx, setTonicIdx] = useState(0);
    const [scaleId, setScaleId] = useState('bilawal');
    const [target, setTarget] = useState<number | null>(null);
    const [answered, setAnswered] = useState<number | null>(null);
    const [score, setScore] = useState(0);
    const [asked, setAsked] = useState(0);

    const saHz = TONICS[tonicIdx].hz;
    const notes = scaleById(scaleId).semitones;

    // Sa, then the mystery note a beat later. Cleared on unmount so a pending
    // note cannot fire into a page that has gone.
    const timer = useRef(0);
    useEffect(() => () => clearTimeout(timer.current), []);
    const play = (semi: number) => {
        playNote(saHz, 1, 0.18);
        timer.current = window.setTimeout(() => playNote(pitchOf(saHz, semi, 'just'), 1.4, 0.22), 650);
    };

    const next = () => {
        const semi = notes[Math.floor(Math.random() * notes.length)];
        setTarget(semi);
        setAnswered(null);
        play(semi);
    };

    const answer = (semi: number) => {
        if (target === null || answered !== null) return;
        setAnswered(semi);
        setAsked((a) => a + 1);
        if (semi === target) setScore((s) => s + 1);
    };

    const right = answered !== null && answered === target;

    return (
        <ToolShell
            deva="कान"
            title="Ear trainer"
            blurb="Sa sounds first, then a swara from the scale you picked. Name it."
            onBack={onBack}
        >
            <div className="tool-row">
                <TonicPicker value={tonicIdx} onChange={setTonicIdx} />
                <label className="tool-field">
                    <span>Notes drawn from</span>
                    <select value={scaleId} onChange={(e) => setScaleId(e.target.value)}>
                        {SCALES.map((s) => (
                            <option key={s.id} value={s.id}>
                                {s.name}
                            </option>
                        ))}
                    </select>
                </label>
                <button className="primary tool-btn" onClick={next}>
                    {target === null ? 'Start' : 'Next →'}
                </button>
                {target !== null && (
                    <button className="ghost tool-btn" onClick={() => play(target)}>
                        ↺ Again
                    </button>
                )}
                <span className="tool-readout">
                    <b>{score}</b> right of {asked}
                </span>
            </div>

            {target !== null && (
                <>
                    <p className={`ear-feedback${answered === null ? '' : right ? ' good' : ' bad'}`}>
                        {answered === null
                            ? 'Listening…'
                            : `${right ? 'Right' : 'No'} — it was ${swaraAt(target).full}`}
                    </p>
                    <div className="answer-grid">
                        {notes.map((semi) => (
                            <button
                                key={semi}
                                className={`answer${answered === semi ? (right ? ' good' : ' bad') : ''}${answered !== null && semi === target ? ' good' : ''
                                    }`}
                                onClick={() => answer(semi)}
                            >
                                <span className="answer-deva">{swaraAt(semi).devanagari}</span>
                                <span>{swaraAt(semi).roman}</span>
                            </button>
                        ))}
                    </div>
                </>
            )}
        </ToolShell>
    );
}