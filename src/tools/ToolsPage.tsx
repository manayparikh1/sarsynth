import { useEffect, useRef, useState } from 'react';
import { DroneBox } from './DroneBox';
import { EarTrainer } from './EarTrainer';
import { ScaleFinder } from './ScaleFinder';
import { TaalMetronome } from './TaalMetronome';
import { TheoryReference } from './TheoryReference';
import { Tuner } from './Tuner';
import './tools.css';

type ToolId = 'scale' | 'theory' | 'taal' | 'drone' | 'ear' | 'tuner';

const TOOLS: { id: ToolId; deva: string; name: string; blurb: string }[] = [
    {
        id: 'scale',
        deva: 'खोज',
        name: 'Scale & raga finder',
        blurb: 'Tap the notes you know and see which thaats, ragas and western scales hold them.',
    },
    {
        id: 'theory',
        deva: 'शास्त्र',
        name: 'Music theory',
        blurb: 'The twelve swaras, the ten thaats, every interval, and how chords map onto sargam.',
    },
    {
        id: 'taal',
        deva: 'ताल',
        name: 'Taal & metronome',
        blurb: 'Teental, jhaptaal, rupak and more — with sam, tali and khali marked, plus tap tempo.',
    },
    {
        id: 'drone',
        deva: 'तानपूरा',
        name: 'Drone & shruti box',
        blurb: 'A tanpura to practise against, with the companion string the raga asks for.',
    },
    {
        id: 'ear',
        deva: 'कान',
        name: 'Ear trainer',
        blurb: 'Name the swara, name the interval, or hear whether a note is sharp or flat.',
    },
    {
        id: 'tuner',
        deva: 'सुर',
        name: 'Tuner',
        blurb: 'Tune to your own Sa in just intonation, with cents off shown as you hold the note.',
    },
];

export function ToolsPage({ onBack }: { onBack: () => void }) {
    const [open, setOpen] = useState<ToolId | null>(null);
    const close = () => setOpen(null);

    // Opening a tool from halfway down the hub should not drop you halfway
    // down the tool.
    const scroller = useRef<HTMLDivElement>(null);
    useEffect(() => {
        scroller.current?.scrollTo({ top: 0 });
    }, [open]);

    return (
        <div className="overlay tools-overlay" ref={scroller}>
            {open === 'scale' ? (
                <ScaleFinder onBack={close} />
            ) : open === 'theory' ? (
                <TheoryReference onBack={close} />
            ) : open === 'taal' ? (
                <TaalMetronome onBack={close} />
            ) : open === 'drone' ? (
                <DroneBox onBack={close} />
            ) : open === 'ear' ? (
                <EarTrainer onBack={close} />
            ) : open === 'tuner' ? (
                <Tuner onBack={close} />
            ) : (
                <div className="tool">
                    <div className="tool-head">
                        <button className="ghost tool-back" onClick={onBack}>
                            ← Back to the synth
                        </button>
                        <div className="tool-title">
                            <span className="tool-deva">औज़ार</span>
                            <h1>Toolkit</h1>
                        </div>
                        <p className="tool-blurb">
                            Six small tools for the work around the playing — finding a raga, keeping a cycle,
                            checking your Sa. Everything runs in this browser, offline, with no accounts.
                        </p>
                    </div>

                    <div className="tool-grid">
                        {TOOLS.map((t) => (
                            <button className="tool-card" key={t.id} onClick={() => setOpen(t.id)}>
                                <span className="tool-card-deva">{t.deva}</span>
                                <span className="tool-card-body">
                                    <span className="tool-card-name">{t.name}</span>
                                    <span className="tool-card-blurb">{t.blurb}</span>
                                </span>
                                <span className="tool-card-go">→</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}