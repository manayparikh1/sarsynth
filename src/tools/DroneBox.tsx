import { useEffect, useRef, useState } from 'react';
import { TONICS } from '../music/ragas';
import { pitchOf, swaraAt } from '../music/swaras';
import { audio, playNote, startDrone, transposeName, type Drone } from './toolAudio';
import { Slider, ToolShell, TonicPicker } from './ToolChrome';
type Companion = 'P' | 'm' | 'N' | 'n' | 'none';
const COMPANIONS: { id: Companion; label: string; semi: number; note: string }[] = [
    { id: 'P', label: 'Pa', semi: 7, note: 'The usual choice — Sa and Pa, a perfect fifth apart' },
    { id: 'm', label: 'Ma', semi: 5, note: 'For ragas that drop Pa, like Malkauns or Bageshri' },
    { id: 'N', label: 'Ni', semi: 11, note: 'For Marwa and Puriya, where Pa is weak and Ni carries' },
    { id: 'n', label: 'komal Ni', semi: 10, note: 'Darker still — sits under Bhairavi and Asavari' },
    { id: 'none', label: 'Sa only', semi: 0, note: 'Just the tonic, doubled across two octaves' },
];
export function DroneBox({ onBack }: { onBack: () => void }) {
    const [tonicIdx, setTonicIdx] = useState(0);
    const [companionId, setCompanionId] = useState<Companion>('P');
    const [level, setLevel] = useState(0.18);
    const [on, setOn] = useState(false);
    const [plucking, setPlucking] = useState(true);
    const [pace, setPace] = useState(1.05);
    const [string, setString] = useState(-1);
    const tonic = TONICS[tonicIdx];
    const saHz = tonic.hz;
    const companion = COMPANIONS.find((c) => c.id === companionId) ?? COMPANIONS[0];
    //the four tanpura string below sa, two middle sa, and then low sa that the cycle lands on
    const strings = [companion.semi - 12, 0, 0, -12];

    const droneRef = useRef<Drone | null>(null);
    const levelRef = useRef(level);
    levelRef.current = level;
    const paceRef = useRef(pace);
    paceRef.current = pace;
    const stringsRef = useRef(strings);
    stringsRef.current = strings;
    const saRef = useRef(saHz);
    saRef.current = saHz;

    //---the sustained drone---

    useEffect(() => {
        if (!on) return;
        const freqs = [saHz / 2, saHz, pitchOf(saHz, companion.semi, 'just') / 2];
        const drone = startDrone(companionId === 'none' ? [saHz / 2, saHz] : freqs, levelRef.current);
        droneRef.current = drone;
        return () => {
            drone.stop();
            droneRef.current = null;
        };
    }, [on, saHz, companion.semi, companionId]);
    useEffect(() => {
        droneRef.current?.setLevel(level);
    }, [level]);
    //--the plucked cycle---//
    const nextTime = useRef(0);
    const step = useRef(0);
    const queue = useRef<{ i: number; time: number }[]>([]);

    useEffect(() => {
        if (!on || !plucking) {
            setString(-1);
            return;
        }
        const ac = audio();
        step.current = 0;
        queue.current = [];
        nextTime.current = ac.currentTime + 0.1;

        const scheduler = window.setInterval(() => {
            while (nextTime.current < ac.currentTime + 0.3) {
                const i = step.current % stringsRef.current.length;
                const semi = stringsRef.current[i];
                // The low Sa is the one that rings on, so it gets the long tail.
                const long = i === stringsRef.current.length - 1;
                playNote(
                    pitchOf(saRef.current, semi, 'just'),
                    long ? paceRef.current * 3.4 : paceRef.current * 2.2,
                    (long ? 0.26 : 0.2) * (levelRef.current / 0.18) * 0.55,
                    nextTime.current - ac.currentTime
                );
                queue.current.push({ i, time: nextTime.current });
                nextTime.current += paceRef.current;
                step.current += 1;
            }
        }, 40);

        let frame = 0;
        const follow = () => {
            const now = audio().currentTime;
            while (queue.current.length && queue.current[0].time <= now) {
                setString(queue.current.shift()!.i);
            }
            frame = requestAnimationFrame(follow);
        };
        frame = requestAnimationFrame(follow);

        return () => {
            clearInterval(scheduler);
            cancelAnimationFrame(frame);
        };
    }, [on, plucking]);

    return (
        <ToolShell
            deva="तानपूरा"
            title="Drone & shruti box"
            blurb="A tanpura to practise against. Pick your Sa, pick the companion string the raga wants, and leave it running."
            onBack={onBack}
        >
            <div className="tool-row">
                <TonicPicker value={tonicIdx} onChange={setTonicIdx} />
                <button className="primary tool-btn" onClick={() => setOn((v) => !v)}>
                    {on ? '■ Stop drone' : '▶ Start drone'}
                </button>
                <button
                    className={`chip${plucking ? ' on' : ''}`}
                    onClick={() => setPlucking((v) => !v)}
                >
                    Plucked strings
                </button>
                <span className="tool-readout">
                    Sa {tonic.name} · {saHz.toFixed(2)} Hz · {tonic.marking}
                </span>
            </div>
            <div className="tool-row">
                {COMPANIONS.map((c) => (
                    <button
                        key={c.id}
                        className={`chip${c.id === companionId ? ' on' : ''}`}
                        onClick={() => setCompanionId(c.id)}
                    >
                        {c.label}
                    </button>
                ))}
            </div>
            <p className="tool-note">{companion.note}</p>

            <div className="string-view">
                {strings.map((semi, i) => (
                    <button
                        className={`string${string === i ? ' now' : ''}`}
                        key={i}
                        onClick={() => playNote(pitchOf(saHz, semi, 'just'), 2.4, 0.22)}
                    >
                        <span className="string-deva">{swaraAt(semi).devanagari}</span>
                        <span className="string-name">
                            {swaraAt(semi).roman}
                            {semi < 0 ? ' ·' : ''}
                        </span>
                        <span className="dim">
                            { }
                        </span>