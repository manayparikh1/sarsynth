import { ARTICULATIONS } from '../music/poses';
import type { Snapshot } from '../perform/performer';
import type { SceneLabel } from '../render/scene';

interface Props {
    snap: Snapshot;
    label: SceneLabel | undefined;
    droneOn: boolean;
    cameraOn: boolean;
}

const OCTAVE_NAMES: Record<number, string> = {
    [-1]: 'mandra',
    0: 'madhya',
    1: 'taar',
};

export function Readout({ snap, label, droneOn, cameraOn }: Props) {
    const artic = ARTICULATIONS.find((a) => a.id === snap.articulation);

    return (
        <div className="readout">
            <div className={`swara-now${snap.playing ? ' on' : ''}`}>
                <span className="swara-deva">{label?.devanagari ?? '—'}</span>
                <span className="swara-roman">{label ? label.roman.toLowerCase() : 'rest'}</span>
            </div>

            <div className="stats">
                <Stat label="octave" value={OCTAVE_NAMES[snap.octave]} />
                <Stat label="pitch" value={snap.freq && snap.playing ? `${snap.freq.toFixed(1)} Hz` : '—'} />
                <Stat label="ornament" value={artic?.name.toLowerCase() ?? '—'} />
                <Stat label="gamak" value={`${Math.round(snap.gamak * 100)}%`} />
            </div>

            <div className="pills">
                <span className={`pill${droneOn ? ' on' : ''}`}>tanpura</span>
                <span className={`pill${snap.sustain ? ' on' : ''}`}>{snap.sustain ? 'ring' : 'damp'}</span>
                {cameraOn && (
                    <>
                        <span className={`pill${snap.swaraHandSeen ? ' on' : ''}`}>swara hand</span>
                        <span className={`pill${snap.expressionHandSeen ? ' teal' : ''}`}>expr hand</span>
                        <span className="pill quiet">{snap.fps} fps</span>
                    </>
                )}
            </div>
        </div>
    );
}

function Stat({ label, value }: { label: string; value: string }) {
    return (
        <div className="stat">
            <span className="stat-label">{label}</span>
            <span className="stat-value">{value}</span>
        </div>
    );
}