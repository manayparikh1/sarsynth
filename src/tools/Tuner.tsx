import { useEffect, useRef, useState } from 'react';
import { TONICS } from '../music/ragas';
import { swaraAt } from '../music/swaras';
import { audio, nearestNote, playNote } from './toolAudio';
import { ToolShell, TonicPicker } from './ToolChrome';

function detectPitch(buf: Float32Array, rate: number): number {
    let power = 0;
    for (const v of buf) power += v * v;
    if (Math.sqrt(power / buf.length) < 0.01) return -1; // too quiet

    const n = buf.length;
    const corr = new Float32Array(n);
    for (let lag = 0; lag < n; lag++) {
        let sum = 0;
        for (let i = 0; i < n - lag; i++) sum += buf[i] * buf[i + lag];
        corr[lag] = sum;
    }
    let lag = 0;
    while (lag < n - 1 && corr[lag] > corr[lag + 1]) lag++; // skip the peak at zero
    let best = lag;
    for (let i = lag; i < n; i++) if (corr[i] > corr[best]) best = i;

    const a = corr[best - 1];
    const b = corr[best];
    const c = corr[best + 1] ?? b;
    const curve = (a + c - 2 * b) / 2;
    const hz = rate / (curve ? best - (c - a) / 2 / (2 * curve) : best);
    return hz > 55 && hz < 2200 ? hz : -1;
}
export function Tuner({ onBack }: { onBack: () => void }) {
    const [tonicIdx, setTonicIdx] = useState(0);
    const [on, setOn] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hz, setHz] = useState(0);
    const saHz = TONICS[tonicIdx].hz;
    const stream = useRef<MediaStream | null>(null);
    useEffect(() => {
        if (!on) return;
        let dead = false;
        let id = 0;
        const ac = audio();
        navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, autoGainControl: false } })
            .then((s) => {
                if (dead) return s.getTracks().forEach((t) => t.stop());

                stream.current = s;
                const analyser = ac.createAnalyser();
                analyser.fftSize = 2048;
                ac.createMediaStreamSource(s).connect(analyser);
                const buf = new Float32Array(analyser.fftSize);
                id = window.setInterval(() => {
                    analyser.getFloatTimeDomainData(buf);
                    const found = detectPitch(buf, ac.sampleRate);
                    setHz(found > 0 ? found : 0);
                }, 80);
            })
            .catch((e: Error) => {
                setError(`Microphone unavailable (${e.message}).`);
                setOn(false);
            });
        return () => {
            dead = true;
            clearInterval(id);
            stream.current?.getTracks().forEach((t) => t.stop());
            stream.current = null;
            setHz(0);
        };
    }, [on]);
    //semitones that are above sa spslit into the nearest swara and how far off it is
    const steps = hz > 0 ? 12 * Math.log2(hz / saHz) : 0;
    const swara = hz > 0 ? swaraAt(Math.round(steps)) : null;
    const cents = hz > 0 ? Math.round((steps - Math.round(steps)) * 100) : 0;
    const west = hz > 0 ? nearestNote(hz) : null;
    return (
        <ToolShell
            deva="सुर"
            title="Tuner"
            blurb="Hold a note near the mic and it is named as a swara above your Sa, with the error in cents. Nothing is recorded or sent anywhere."
            onBack={onBack}
        >
            <div className="tool-row">
                <TonicPicker value={tonicIdx} onChange={setTonicIdx} />
                <button className="primary tool-btn" onClick={() => setOn((v) => !v)}>
                    {on ? '■ Stop listening' : '● Use microphone'}
                </button>
                <button className="ghost tool-btn" onClick={() => playNote(saHz, 2.2, 0.22)}>
                    Sound Sa
                </button>
            </div>
            {error && <p className="error">{error}</p>}

            <div className={`tuner-face${swara && Math.abs(cents) < 6 ? ' locked' : ''}`}>
                <div className="tuner-swara">
                    <span className="tuner-deva">{swara ? swara.devanagari : '—'}</span>
                    <span>{swara ? swara.full : on ? 'Play or sing a note…' : 'Microphone off'}</span>
                </div>
                <div className="cents-track">
                    <i className="cents-centre" />
                    {swara && (
                        <i
                            className="cents-needle"
                            style={{ left: `${50 + Math.max(-50, Math.min(50, cents))}%` }}
                        />
                    )}
                </div>
                <div className="tool-hud">
                    <Stat label="Detected" value={hz > 0 ? `${hz.toFixed(1)} Hz` : '—'} />
                    <Stat label="Off by" value={swara ? `${cents > 0 ? '+' : ''}${cents} cents` : '—'} />
                    <Stat label="Western" value={west ? `${west.name}${west.octave}` : '—'} />
                </div>
            </div>
        </ToolShell>
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