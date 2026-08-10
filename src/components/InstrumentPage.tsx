import type { InstrumentBlurb } from '../instrumentInfo';

interface Props {
    instrument: InstrumentBlurb;
    onBack: () => void;
}

export function InstrumentPage({ instrument, onBack }: Props) {
    return (
        <div className="overlay page-overlay">
            <div className="instrument-page">
                <button className="ghost back" onClick={onBack}>
                    ← Back
                </button>
                <img className="instrument-page-img" src={instrument.img} alt={instrument.name} />
                <div className="instrument-page-text">
                    <h1 className="instrument-page-name">{instrument.name}</h1>
                    <p className="instrument-page-history">{instrument.history}</p>
                </div>
            </div>
        </div>
    );
}
