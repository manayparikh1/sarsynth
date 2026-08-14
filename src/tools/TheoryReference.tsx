import { useState } from 'react';
import { SCALES, TONICS } from '../music/ragas';
import { JUST_RATIOS, SWARAS, pitchOf, swaraAt } from '../music/swaras';
import { playNote, transposeName } from './toolAudio';
import { Segmented, ToolShell, TonicPicker } from './ToolChrome';

type Tab = 'swaras' | 'thaats' | 'intervals' | 'chords';

/** Same order as JUST_RATIOS — written out so the table can show the fraction. */
const RATIO_TEXT = [
    '1/1',
    '16/15',
    '9/8',
    '6/5',
    '5/4',
    '4/3',
    '45/32',
    '3/2',
    '8/5',
    '5/3',
    '16/9',
    '15/8',
];

const INTERVALS: { semi: number; western: string; short: string; feel: string }[] = [
    { semi: 0, western: 'Unison', short: 'P1', feel: 'The ground. Everything else is heard against it' },
    { semi: 1, western: 'Minor second', short: 'm2', feel: 'Tight and pressing — komal Re leaning back onto Sa' },
    { semi: 2, western: 'Major second', short: 'M2', feel: 'One clean step up' },
    { semi: 3, western: 'Minor third', short: 'm3', feel: 'The shade that makes a scale sound minor' },
    { semi: 4, western: 'Major third', short: 'M3', feel: 'Bright and settled' },
    { semi: 5, western: 'Perfect fourth', short: 'P4', feel: 'Strong and stable — the second pillar after Sa' },
    { semi: 6, western: 'Tritone', short: 'TT', feel: 'Restless. Tivra Ma, the swara that colours Yaman and Marwa' },
    { semi: 7, western: 'Perfect fifth', short: 'P5', feel: 'The most consonant step there is. Pa, the drone partner' },
    { semi: 8, western: 'Minor sixth', short: 'm6', feel: 'Heavy and grave — komal Dha' },
    { semi: 9, western: 'Major sixth', short: 'M6', feel: 'Open and singing' },
    { semi: 10, western: 'Minor seventh', short: 'm7', feel: 'Wants to fall back down — komal Ni' },
    { semi: 11, western: 'Major seventh', short: 'M7', feel: 'Right under the upper Sa, straining towards it' },
];

const CHORDS: { id: string; name: string; semis: number[] }[] = [
    { id: 'maj', name: 'Major', semis: [0, 4, 7] },
    { id: 'min', name: 'Minor', semis: [0, 3, 7] },
    { id: 'dim', name: 'Diminished', semis: [0, 3, 6] },
    { id: 'aug', name: 'Augmented', semis: [0, 4, 8] },
    { id: 'sus2', name: 'Sus 2', semis: [0, 2, 7] },
    { id: 'sus4', name: 'Sus 4', semis: [0, 5, 7] },
    { id: 'maj7', name: 'Major 7', semis: [0, 4, 7, 11] },
    { id: 'min7', name: 'Minor 7', semis: [0, 3, 7, 10] },
    { id: 'dom7', name: 'Dominant 7', semis: [0, 4, 7, 10] },
    { id: 'add9', name: 'Added 9', semis: [0, 4, 7, 14] },
];

export function TheoryReference({ onBack }: { onBack: () => void }) {
    const [tab, setTab] = useState<Tab>('swaras');
    const [tonicIdx, setTonicIdx] = useState(0);
    const [root, setRoot] = useState(0);
    const [chordId, setChordId] = useState('maj');

    const tonic = TONICS[tonicIdx];
    const saHz = tonic.hz;
    const thaats = SCALES.filter((s) => s.group === 'thaat');
    const chord = CHORDS.find((c) => c.id === chordId) ?? CHORDS[0];

    const playChord = (spread: boolean) =>
        chord.semis.forEach((semi, i) =>
            playNote(pitchOf(saHz, root + semi, 'equal'), 1.6, 0.16, spread ? i * 0.22 : 0)
        );

    return (
        <ToolShell
            deva="शास्त्र"
            title="Music theory"
            blurb="The twelve swaras, the ten thaats they come from, what each interval sounds like, and how western chords line up against sargam."
            onBack={onBack}
        >
            <div className="tool-row">
                <TonicPicker value={tonicIdx} onChange={setTonicIdx} />
                <Segmented
                    value={tab}
                    onChange={setTab}
                    options={[
                        { id: 'swaras', label: 'Swaras' },
                        { id: 'thaats', label: 'Thaats' },
                        { id: 'intervals', label: 'Intervals' },
                        { id: 'chords', label: 'Chords' },
                    ]}
                />
            </div>

            {tab === 'swaras' && (
                <>
                    <table className="tool-table">
                        <thead>
                            <tr>
                                <th />
                                <th>Swara</th>
                                <th>Full name</th>
                                <th>Semitones</th>
                                <th>Western</th>
                                <th>Just ratio</th>
                                <th>Hz</th>
                                <th />
                            </tr>
                        </thead>
                        <tbody>
                            {SWARAS.map((s) => (
                                <tr key={s.id} className={s.variant}>
                                    <td className="cell-deva">{s.devanagari}</td>
                                    <td>{s.roman}</td>
                                    <td className="dim">{s.full}</td>
                                    <td className="dim">{s.semitone}</td>
                                    <td>{transposeName(tonic.name, s.semitone)}</td>
                                    <td className="dim">{RATIO_TEXT[s.semitone]}</td>
                                    <td className="dim">{pitchOf(saHz, s.semitone, 'just').toFixed(1)}</td>
                                    <td>
                                        <button
                                            className="icon"
                                            aria-label={`Play ${s.full}`}
                                            onClick={() => playNote(pitchOf(saHz, s.semitone, 'just'), 1, 0.2)}
                                        >
                                            ▶
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <p className="tool-note">
                        Sa and Pa never move. Re, Ga, Dha and Ni each have a komal (lowered) form, Ma has a
                        tivra (raised) one — twelve positions in all, which is where the seven-note scales get
                        their variety. The Hz column follows just intonation, the same tuning the synth uses by
                        default.
                    </p>
                </>
            )}

            {tab === 'thaats' && (
                <>
                    <div className="thaat-grid">
                        {thaats.map((t) => (
                            <div className="thaat" key={t.id}>
                                <div className="thaat-top">
                                    <span className="result-name">{t.name}</span>
                                    <button
                                        className="icon"
                                        aria-label={`Play ${t.name}`}
                                        onClick={() =>
                                            [...t.semitones, 12].forEach((semi, i) =>
                                                playNote(pitchOf(saHz, semi, 'just'), 0.7, 0.2, i * 0.24)
                                            )
                                        }
                                    >
                                        ▶
                                    </button>
                                </div>
                                <div className="dots">
                                    {Array.from({ length: 12 }, (_, semi) => (
                                        <i
                                            key={semi}
                                            className={t.semitones.includes(semi) ? 'on' : ''}
                                            title={swaraAt(semi).full}
                                        />
                                    ))}
                                </div>
                                <div className="result-swaras">
                                    {t.semitones.map((semi) => (
                                        <span key={semi} className={`swara-chip ${swaraAt(semi).variant}`}>
                                            {swaraAt(semi).roman}
                                        </span>
                                    ))}
                                </div>
                                <p className="result-note">{t.note}</p>
                            </div>
                        ))}
                    </div>
                    <p className="tool-note">
                        Bhatkhande sorted Hindustani ragas into ten parent scales. A thaat is only a set of
                        notes — a raga adds which notes you may lean on, which you skip on the way down, and
                        when in the day it belongs.
                    </p>
                </>
            )}

            {tab === 'intervals' && (
                <table className="tool-table">
                    <thead>
                        <tr>
                            <th>Semis</th>
                            <th>Interval</th>
                            <th>Swara</th>
                            <th>Cents (equal)</th>
                            <th>Cents (just)</th>
                            <th>How it sits</th>
                            <th />
                        </tr>
                    </thead>
                    <tbody>
                        {INTERVALS.map((iv) => {
                            const justCents = 1200 * Math.log2(JUST_RATIOS[iv.semi]);
                            return (
                                <tr key={iv.semi}>
                                    <td className="dim">{iv.semi}</td>
                                    <td>
                                        {iv.western} <span className="dim">{iv.short}</span>
                                    </td>
                                    <td>{swaraAt(iv.semi).roman}</td>
                                    <td className="dim">{iv.semi * 100}</td>
                                    <td className="dim">{justCents.toFixed(0)}</td>
                                    <td className="dim">{iv.feel}</td>
                                    <td>
                                        <button
                                            className="icon"
                                            aria-label={`Play ${iv.western}`}
                                            onClick={() => {
                                                playNote(saHz, 1.5, 0.16);
                                                playNote(pitchOf(saHz, iv.semi, 'just'), 1.5, 0.16, 0.02);
                                            }}
                                        >
                                            ▶
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            )}

            {tab === 'chords' && (
                <>
                    <div className="tool-row">
                        <label className="tool-field">
                            <span>Root</span>
                            <select value={root} onChange={(e) => setRoot(Number(e.target.value))}>
                                {Array.from({ length: 12 }, (_, semi) => (
                                    <option key={semi} value={semi}>
                                        {transposeName(tonic.name, semi)} — {swaraAt(semi).roman} (
                                        {swaraAt(semi).variant})
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="tool-field">
                            <span>Quality</span>
                            <select value={chordId} onChange={(e) => setChordId(e.target.value)}>
                                {CHORDS.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <button className="ghost tool-btn" onClick={() => playChord(false)}>
                            Play together
                        </button>
                        <button className="ghost tool-btn" onClick={() => playChord(true)}>
                            Play spread
                        </button>
                    </div>

                    <div className="chord-view">
                        <h3 className="chord-name">
                            {transposeName(tonic.name, root)} {chord.name}
                        </h3>
                        <div className="chord-notes">
                            {chord.semis.map((semi) => (
                                <button
                                    className="chord-note"
                                    key={semi}
                                    onClick={() => playNote(pitchOf(saHz, root + semi, 'equal'), 1.2, 0.2)}
                                >
                                    <span className="chord-west">{transposeName(tonic.name, root + semi)}</span>
                                    <span className="chord-deva">{swaraAt(root + semi).devanagari}</span>
                                    <span className="dim">{swaraAt(root + semi).roman}</span>
                                    <span className="dim">+{semi}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                    <p className="tool-note">
                        Chords are borrowed ground — Hindustani music stacks a drone under a single melodic
                        line rather than moving harmony underneath it. This tab is here for arranging and for
                        fusion writing: chords are tuned in equal temperament, since stacked just intervals
                        drift audibly out of true.
                    </p>
                </>
            )}
        </ToolShell>
    );
}
