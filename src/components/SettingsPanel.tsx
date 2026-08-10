import type { PerformerConfig } from '../perform/performer';

interface Props {
    config: PerformerConfig;
    onChange: (patch: Partial<PerformerConfig>) => void;
    onClose: () => void;
    cameraOn: boolean;
}

export function SettingsPanel({ config, onChange, onClose, cameraOn }: Props) {
    return (
        <div className="panel settings">
            <div className="panel-head">
                <h2>Settings</h2>
                <button className="icon" onClick={onClose} aria-label="Close settings">
                    ✕
                </button>
            </div>

            <Section title="Sound">
                <Slider
                    label="Volume"
                    value={config.masterVolume}
                    min={0}
                    max={1}
                    onChange={(v) => onChange({ masterVolume: v })}
                    format={(v) => `${Math.round(v * 100)}%`}
                />
                <Slider
                    label="Reverb"
                    value={config.reverb}
                    min={0}
                    max={0.7}
                    onChange={(v) => onChange({ reverb: v })}
                    format={(v) => `${Math.round((v / 0.7) * 100)}%`}
                />
                <Slider
                    label="Tanpura level"
                    value={config.droneLevel}
                    min={0}
                    max={1}
                    onChange={(v) => onChange({ droneLevel: v })}
                    format={(v) => `${Math.round(v * 100)}%`}
                />
            </Section>

            <Section title="Response">
                <Slider
                    label="Silence threshold"
                    value={config.threshold}
                    min={0.02}
                    max={0.4}
                    step={0.01}
                    onChange={(v) => onChange({ threshold: v })}
                    format={(v) => `${Math.round(v * 100)}%`}
                    hint="How far the melody hand must rise before a note starts. Raise it if notes creep in when your hand is resting."
                />
            </Section>

            <Section title="Articulation">
                <Slider
                    label="Meend (glide)"
                    value={config.meend}
                    min={0}
                    max={0.45}
                    step={0.005}
                    onChange={(v) => onChange({ meend: v })}
                    format={(v) => `${Math.round(v * 1000)} ms`}
                    hint="How long the pitch takes to slide when you change pose. Zero snaps."
                />
            </Section>

            <Section title="Tuning">
                <div className="radio-row">
                    {(['just', 'equal'] as const).map((t) => (
                        <button
                            key={t}
                            className={`chip${config.tuning === t ? ' on' : ''}`}
                            onClick={() => onChange({ tuning: t })}
                        >
                            {t === 'just' ? 'Just (shruti)' : 'Equal temperament'}
                        </button>
                    ))}
                </div>
                <p className="hint">
                    Just intonation tunes every swara against the drone, the way a tanpura reinforces them.
                    Equal temperament matches a keyboard.
                </p>
            </Section>

            {cameraOn && (
                <Section title="Hands">
                    <Toggle
                        label="Swap hand detection"
                        checked={config.swapHands}
                        onChange={(v) => onChange({ swapHands: v })}
                        hint="Use this if the tracker has your left and right the wrong way round."
                    />
                    <Toggle
                        label="Swap roles"
                        checked={config.swapRoles}
                        onChange={(v) => onChange({ swapRoles: v })}
                        hint="Put the swara poses on your right hand and the expression on your left."
                    />
                    <Toggle
                        label="Show camera"
                        checked={config.showCamera}
                        onChange={(v) => onChange({ showCamera: v })}
                    />
                    <Toggle
                        label="Show hand skeleton"
                        checked={config.showSkeleton}
                        onChange={(v) => onChange({ showSkeleton: v })}
                    />
                </Section>
            )}
        </div>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="panel-section">
            <h3>{title}</h3>
            {children}
        </section>
    );
}

function Slider({
    label,
    value,
    min,
    max,
    step = 0.01,
    onChange,
    format,
    hint,
}: {
    label: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    onChange: (v: number) => void;
    format: (v: number) => string;
    hint?: string;
}) {
    return (
        <div className="control">
            <div className="control-head">
                <span>{label}</span>
                <span className="control-value">{format(value)}</span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
            />
            {hint && <span className="hint">{hint}</span>}
        </div>
    );
}

function Toggle({
    label,
    checked,
    onChange,
    hint,
}: {
    label: string;
    checked: boolean;
    onChange: (v: boolean) => void;
    hint?: string;
}) {
    return (
        <div className="control">
            <label className="toggle">
                <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
                <span>{label}</span>
            </label>
            {hint && <span className="hint">{hint}</span>}
        </div>
    );
}