import type { ReactNode } from 'react';
import { TONICS } from '../music/ragas';
export function ToolShell({
    deva,
    title,
    blurb,
    onBack,
    children,
}: {
    deva: string;
    title: string;
    blurb?: string;
    onBack: () => void;
    children: ReactNode;
}) {
    return (
        <div className="tool">
            <div className="tool-head">
                <button className="ghost tool-back" onClick={onBack}>
                    ← Toolkit
                </button>
                <div className="tool-title">
                    <span className="tool-deva">{deva}</span>
                    <h1>{title}</h1>
                </div>
                {blurb && <p className="tool-blurb">{blurb}</p>}
            </div>
            {children}
        </div>
    );
}
export function TonicPicker({ value, onChange }: { value: number; onChange: (i: number) => void }) {
    return (
        <label className="tool-field">
            <span>Sa</span>
            <select value={value} onChange={(e) => onChange(Number(e.target.value))}>
                {TONICS.map((t, i) => (
                    <option key={i} value={i}>
                        {t.name} — {t.marking} — {t.hz.toFixed(2)} Hz
                    </option>
                ))}
            </select>
        </label>
    );
}

export function Segmented<T extends string>({
    value,
    options,
    onChange,
}: {
    value: T;
    options: { id: T; label: string }[];
    onChange: (id: T) => void;
}) {
    return (
        <div className="tool-segmented">
            {options.map((o) => (
                <button
                    key={o.id}
                    className={`chip${o.id === value ? ' on' : ''}`}
                    onClick={() => onChange(o.id)}
                >
                    {o.label}
                </button>
            ))}
        </div>
    );
}

export function Slider({
    label,
    value,
    min,
    max,
    step = 1,
    display,
    onChange,
}: {
    label: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    display?: string;
    onChange: (v: number) => void;
}) {
    return (
        <div className="control">
            <div className="control-head">
                <span>{label}</span>
                <span className="control-value">{display ?? value}</span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
            />
        </div>
    );
}