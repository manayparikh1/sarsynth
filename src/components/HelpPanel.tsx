import { ARTICULATIONS, DEGREE_POSES } from '../music/poses';

interface Props {
    onClose: () => void;
    swapRoles: boolean;
    cameraOn: boolean;
    /** Swara names of the current scale, in degree order. */
    swaras: string[];
}

export function HelpPanel({ onClose, swapRoles, cameraOn, swaras }: Props) {
    const swaraHand = swapRoles ? 'Right hand' : 'Left hand';
    const other = swapRoles ? 'Left hand' : 'Right hand';

    return (
        <div className="panel help">
            <div className="panel-head">
                <h2>How to play</h2>
                <button className="icon" onClick={onClose} aria-label="Close help">
                    ✕
                </button>
            </div>

            {cameraOn && (
                <>
                    <p className="lede">
                        Your {swaraHand.toLowerCase()} names the swara by how many fingers you hold up. Your{' '}
                        {other.toLowerCase()} decides how loud it is and how it is played.
                    </p>

                    <section className="panel-section">
                        <h3 className="melody">{swaraHand} — the swara</h3>
                        <div className="pose-list">
                            {DEGREE_POSES.slice(0, swaras.length).map((pose, i) => (
                                <div className="pose-row" key={i}>
                                    <Glyph pose={pose} tone="melody" />
                                    <span className="pose-name">{swaras[i].toLowerCase()}</span>
                                </div>
                            ))}
                        </div>
                        <p className="hint">
                            Dots are thumb, index, middle, ring, pinky. One to five fingers give the first five
                            swaras; index and pinky together give the sixth, and adding the thumb gives the
                            seventh. A fist is a rest.
                        </p>
                        <Row gesture="Raise / lower" effect="Octave: top is taar, middle madhya, bottom mandra" />
                        <Row gesture="Lean the hand" effect="Gamak — the further you lean, the deeper the oscillation" />
                    </section>

                    <section className="panel-section">
                        <h3 className="expression">{other} — the expression</h3>
                        <Row gesture="Raise / lower" effect="Volume. Low is silence, high is full" />
                        <Row gesture="Lean the hand" effect="Tone, from dark and covered to bright and open" />
                        <Row gesture="Thumb out / in" effect="Let the note ring, or damp it short" />
                        <div className="pose-list">
                            {ARTICULATIONS.map((a) => (
                                <div className="pose-row" key={a.id}>
                                    <Glyph
                                        pose={[false, ...Array.from({ length: 4 }, (_, i) => i < a.count)]}
                                        tone="expression"
                                    />
                                    <span className="pose-name">{a.name.toLowerCase()}</span>
                                    <span className="pose-note">{a.note}</span>
                                </div>
                            ))}
                        </div>
                    </section>
                </>
            )}

            <section className="panel-section">
                <h3>Without a camera</h3>
                <Row gesture="Click a swara" effect="Play it; drag along the row to move" />
                <Row gesture="A S D F G H J" effect="One key per swara" />
                <Row gesture="Z / X" effect="Octave down / up" />
                <Row gesture="Space" effect="Tanpura on or off" />
            </section>

            <section className="panel-section">
                <h3>Reading the swaras</h3>
                <p className="hint">
                    An underline means komal (flattened); a tick above means tivra Ma (sharpened). Changing
                    the raga changes which swaras the poses reach, so a pentatonic raga like Bhupali uses
                    only the first five.
                </p>
            </section>
        </div>
    );
}

function Glyph({ pose, tone }: { pose: boolean[]; tone: 'melody' | 'expression' }) {
    return (
        <span className={`glyph ${tone}`}>
            {pose.map((on, i) => (
                <i key={i} className={on ? 'on' : ''} />
            ))}
        </span>
    );
}

function Row({ gesture, effect }: { gesture: string; effect: string }) {
    return (
        <div className="help-row">
            <span className="help-gesture">{gesture}</span>
            <span className="help-effect">{effect}</span>
        </div>
    );
}