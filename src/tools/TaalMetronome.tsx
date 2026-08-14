import { useCallback, useEffect, useRef, useState } from 'react';
import { audio, playClick } from './toolAudio';
import { Slider, ToolShell } from './ToolChrome';

type Accent = 'sam' | 'tali' | 'khali' | 'beat';
interface Taal {
    id: string;
    name: string;
    vibhags: number[];
    khali: number[];
    bols: string[];
    note: string;
}
const TAALS: Taal[] = [
    {
        id: 'teental',
        name: 'Teental — 16',
        vibhags: [4, 4, 4, 4],
        khali: [2],
        bols: 'Dha Dhin Dhin Dha Dha Dhin Dhin Dha Dha Tin Tin Ta Ta Dhin Dhin Dha'.split(' '),
        note: 'The workhorse of khayal and most instrumental gats',
    },
    {
        id: 'jhaptaal',
        name: 'Jhaptaal — 10',
        vibhags: [2, 3, 2, 3],
        khali: [2],
        bols: 'Dhi Na Dhi Dhi Na Ti Na Dhi Dhi Na'.split(' '),
        note: 'Lopsided 2-3-2-3 — count the vibhags, not the beats',
    },
    {
        id: 'ektaal',
        name: 'Ektaal — 12',
        vibhags: [2, 2, 2, 2, 2, 2],
        khali: [1, 3],
        bols: 'Dhin Dhin Dhage Tirakita Tu Na Kat Ta Dhage Tirakita Dhin Na'.split(' '),
        note: 'Slow khayal territory — each matra gets room to stretch',
    },
    {
        id: 'rupak',
        name: 'Rupak — 7',
        vibhags: [3, 2, 2],
        khali: [0],
        bols: 'Tin Tin Na Dhin Na Dhin Na'.split(' '),
        note: 'The one taal whose sam is khali — it starts on the wave',
    },
    {
        id: 'keherwa',
        name: 'Keherwa — 8',
        vibhags: [4, 4],
        khali: [1],
        bols: 'Dha Ge Na Ti Na Ka Dhi Na'.split(' '),
        note: 'Light classical, bhajan and film songs',
    },
    {
        id: 'dadra',
        name: 'Dadra — 6',
        vibhags: [3, 3],
        khali: [1],
        bols: 'Dha Dhin Na Dha Tin Na'.split(' '),
        note: 'Thumri and folk — a rolling two-in-three feel',
    },
    { id: 'four', name: '4/4', vibhags: [4], khali: [], bols: [], note: 'Plain four, no cycle markings' },
    { id: 'three', name: '3/4', vibhags: [3], khali: [], bols: [], note: 'Waltz' },
    { id: 'five', name: '5/4', vibhags: [3, 2], khali: [], bols: [], note: 'Grouped three then two' },
    { id: 'seven', name: '7/8', vibhags: [2, 2, 3], khali: [], bols: [], note: 'Grouped two, two, three' },
];
const CLICK: Record<Accent, { hz: number; gain: number }> = {
    sam: { hz: 1500, gain: 0.75 },
    tali: { hz: 980, gain: 0.5 },
    khali: { hz: 620, gain: 0.34 },
    beat: { hz: 800, gain: 0.3 },
};
const matraCount = (t: Taal) => t.vibhags.reduce((a, b) => a + b, 0);

function accents(taal: Taal): Accent[] {
    const out: Accent[] = Array.from({ length: matraCount(taal) },
        () => 'beat');
    let at = 0;
    taal.vibhags.forEach((len, vi) => {
        out[at] = taal.khali.includes(vi) ? 'khali' : vi === 0 ? 'sam' : 'tali';
        at += len;
    });
    return out;
}

function vibhagMarks(taal: Taal): string[] {
    let claps = 1;
    return taal.vibhags.map((_, vi) => {
        if (taal.khali.includes(vi)) return '\u25CB';
        if (vi === 0) return 'x';
        claps += 1;
        return String(claps);
    });
}
export function TaalMetronome({ onBack }: { onBack: () => void }) {
    const [taalId, setTaalId] = useState('teental');
    const [bpm, setBpm] = useState(80);
    const [subdiv, setSubdiv] = useState(1);
    const [volume, setVolume] = useState(0.8);
    const [playing, setPlaying] = useState(false);
    const [active, setActive] = useState(-1);
    const taal = TAALS.find((t) => t.id === taalId) ?? TAALS[0];
    const total = matraCount(taal);
    const marks = accents(taal);
    const clapMarks = vibhagMarks(taal);

    const bpmRef = useRef(bpm);
    bpmRef.current = bpm;
    const subdivRef = useRef(subdiv);
    subdivRef.current = subdiv;
    const volumeRef = useRef(volume);
    volumeRef.current = volume;
    const marksRef = useRef(marks);
    marksRef.current = marks;
    const nextTime = useRef(0);
    const step = useRef(0);
    const queue = useRef<{ matra: number; time: number }[]>([]);

    useEffect(() => {
        if (!playing) {
            setActive(-1);
            return;
        }
        const ac = audio();
        step.current = 0;
        queue.current = [];
        nextTime.current = ac.currentTime + 0.08;

        const scheduler = window.setInterval(() => {
            const n = marksRef.current.length;
            const beat = 60 / bpmRef.current / subdivRef.current;

            while (nextTime.current < ac.currentTime + 0.5) {
                const matra = Math.floor(step.current / subdivRef.current) % n;
                const onMatra = step.current % subdivRef.current === 0;

                const accent = marksRef.current[matra];
                const voice = CLICK[accent];
                if (onMatra) {
                    playClick(voice.hz, voice.gain * volumeRef.current, nextTime.current);
                    queue.current.push({ matra, time: nextTime.current });

                } else {
                    playClick(520, 0.12 * volumeRef.current, nextTime.current);
                }
                nextTime.current += beat;
                step.current += 1;
            }
        }, 25);

        let frame = 0;
        const follow = () => {
            const now = audio().currentTime;
            while (queue.current.length && queue.current[0].time <= now) {
                setActive(queue.current.shift()!.matra);
            }
            frame = requestAnimationFrame(follow);
        };
        frame = requestAnimationFrame(follow);
        return () => {
            clearInterval(scheduler);
            cancelAnimationFrame(frame);
        };
    }, [playing]);
    //--tap tempo--
    const taps = useRef<number[]>([]);
    const tap = useCallback(() => {
        const now = performance.now();
        if (taps.current.length && now - taps.current[taps.current.length - 1] > 2500) {
            taps.current = [];
        }
        if (taps.current.length > 5) taps.current.shift();
        if (taps.current.length >= 2) {
            const spans = taps.current.slice(1).map((t, i) => t - taps.current[i]);
            const avg = spans.reduce((a, b) => a + b, 0) / spans.length;
            setBpm(Math.max(30, Math.min(280, Math.round(60000 / avg))));
        }
        playClick(1100, 0.4);
    }, []);
    const cycleSeconds = (60 / bpm) * total;
    return (
        <ToolShell
            deva="ताल"
            title="Taal & metronome"
            blurb="A metronome that counts in cycles instead of bars. Sam lands loud, tali claps, khali goes hollow — so you can hear where you are in the cycle without looking."
            onBack={onBack}
        >
            <div className="tool-row">
                <label className="tool-field">
                    <span>Taal</span>
                    <select value={taalId} onChange={(e) => setTaalId(e.target.value)}>
                        {TAALS.map((t) => (
                            <option key={t.id} value={t.id}>
                                {t.name}
                            </option>
                        ))}
                    </select>
                </label>
                <button className="primary tool-btn" onClick={() => setPlaying((p) => !p)}>
                    {playing ? '■ Stop' : '▶ Start'}
                </button>
                <button className="ghost tool-btn" onClick={tap}>
                    Tap tempo
                </button>
                <span className="tool-readout">
                    <b>{bpm}</b> bpm · {total} matras · cycle {cycleSeconds.toFixed(1)}s
                </span></div>
            <div className="matra-strip">
                {taal.vibhags.map((len, vi) => {
                    const start = taal.vibhags.slice(0, vi).reduce((a, b) => a + b, 0);
                    return (
                        <div className="vibhag" key={vi}>
                            {Array.from({ length: len }, (_, k) => {
                                const i = start + k;
                                return (
                                    <div
                                        key={i}
                                        className={`matra ${marks[i]}${active === i ? ' now' : ''}`}
                                    >
                                        <span className="matra-num">{i + 1}</span>
                                        {taal.bols[i] && <span className="matra-bol">{taal.bols[i]}</span>}
                                    </div>
                                );
                            })}
                            <span className="vibhag-mark">{clapMarks[vi]}</span>
                        </div>
                    );
                })}
            </div>
            <div className="tool-controls">
                <Slider
                    label="Tempo"
                    min={30}
                    max={280}
                    value={bpm}
                    display={`${bpm} bpm`}
                    onChange={setBpm}
                />
                <Slider
                    label="Subdivision"
                    min={1}
                    max={4}
                    value={subdiv}
                    display={['one per matra', 'two', 'three', 'four'][subdiv - 1]}
                    onChange={setSubdiv}
                />
                <Slider
                    label="Volume"
                    min={0}
                    max={1}
                    step={0.01}
                    value={volume}
                    display={`${Math.round(volume * 100)}%`}
                    onChange={setVolume}
                />
            </div>
            <p className="tool-note">
                <b>x</b> marks sam, the first matra and the point everything resolves to. Numbers mark tali,
                the counted claps. <b>○</b> marks khali — a wave of the hand instead of a clap, and the moment
                a listener can feel the cycle turning over.
            </p>
        </ToolShell>
    );
}


