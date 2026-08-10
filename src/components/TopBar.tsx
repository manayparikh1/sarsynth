import { SCALES, TONICS, scaleById } from '../music/ragas';
import { INSTRUMENTS } from '../audio/instruments';
import type { PerformerConfig } from '../perform/performer';

interface Props {
    config: PerformerConfig;
    onChange: (patch: Partial<PerformerConfig>) => void;
    onOpenSettings: () => void;
    onOpenHelp: () => void;
    onOpenGames: () => void;
}

const GROUP_LABELS: Record<string, string> = {
    thaat: 'Thaats',
    raga: 'Ragas',
    western: 'Western scales',
};

export function TopBar({ config, onChange, onOpenSettings, onOpenHelp, onOpenGames }: Props) {
    const scale = scaleById(config.scaleId);
    const families = [...new Set(INSTRUMENTS.map((i) => i.family))];

    return (
        <div className="topbar">
            <div className="field">
                <label htmlFor="scale">Raga / Scale</label>
                <select
                    id="scale"
                    value={config.scaleId}
                    onChange={(e) => onChange({ scaleId: e.target.value })}
                >
                    {(['raga', 'thaat', 'western'] as const).map((group) => (
                        <optgroup key={group} label={GROUP_LABELS[group]}>
                            {SCALES.filter((s) => s.group === group).map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.name}
                                </option>
                            ))}
                        </optgroup>
                    ))}
                </select>
                {scale.note && <span className="hint">{scale.note}</span>}
            </div>

            <div className="field">
                <label htmlFor="tonic">Sa</label>
                <select
                    id="tonic"
                    value={config.tonicIndex}
                    onChange={(e) => onChange({ tonicIndex: Number(e.target.value) })}
                >
                    {TONICS.map((t, i) => (
                        <option key={t.name} value={i}>
                            {t.name} · {t.marking}
                        </option>
                    ))}
                </select>
            </div>

            <div className="field">
                <label htmlFor="instrument">Instrument</label>
                <select
                    id="instrument"
                    value={config.instrumentId}
                    onChange={(e) => onChange({ instrumentId: e.target.value })}
                >
                    {families.map((family) => (
                        <optgroup key={family} label={family}>
                            {INSTRUMENTS.filter((i) => i.family === family).map((i) => (
                                <option key={i.id} value={i.id}>
                                    {i.name}
                                </option>
                            ))}
                        </optgroup>
                    ))}
                </select>
            </div>

            <div className="topbar-buttons">
                <button
                    className={`tanpura-toggle${config.droneOn ? ' on' : ''}`}
                    onClick={() => onChange({ droneOn: !config.droneOn })}
                    title="Tanpura drone (Space)"
                >
                    तानपूरा
                </button>
                <button className="icon" onClick={onOpenGames} title="Games">
                    ♫
                </button>
                <button className="icon" onClick={onOpenHelp} title="How to play">
                    ?
                </button>
                <button className="icon" onClick={onOpenSettings} title="Settings">
                    ⚙
                </button>
            </div>
        </div>
    );
}