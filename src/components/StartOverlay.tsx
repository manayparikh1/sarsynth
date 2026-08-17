import { InstrumentSidebar } from './InstrumentSidebar';

interface Props {
  phase: 'idle' | 'loading' | 'running' | 'error';
  message: string;
  error: string | null;
  onStart: () => void;
  onStartWithoutCamera: () => void;
  onSelectInstrument: (name: string) => void;
  onOpenTools: () => void;
}

export function StartOverlay({
  phase,
  message,
  error,
  onStart,
  onStartWithoutCamera,
  onSelectInstrument,
  onOpenTools,
}: Props) {
  if (phase === 'running') return null;

  return (
    <div className="overlay">
      <InstrumentSidebar side="left" onSelect={onSelectInstrument} />
      <div className="overlay-card">
        <div className="brand">
          <span className="brand-deva">सरगम</span>
          <span className="brand-roman">sargam synth</span>
        </div>
        <p className="tagline">
          Play sa re ga ma pa dha ni sa with your hands. Hold up fingers on your left hand to name
          the swara — one is Sa, two is Re — and raise your right hand to bring the sound in.
        </p>

        {phase === 'loading' ? (
          <div className="loading">
            <div className="spinner" />
            <span>{message}</span>
          </div>
        ) : (
          <div className="start-actions">
            <button className="primary" onClick={onStart}>
              Enable camera &amp; sound
            </button>
            <button className="ghost" onClick={onStartWithoutCamera}>
              Continue without camera
            </button>
          </div>
        )}

        {phase !== 'loading' && (
          <button className="ghost" onClick={onOpenTools}>
            Practice tools
          </button>
        )}

        {error && <p className="error">{error}</p>}

        <p className="fineprint">
          Hand tracking runs entirely in this browser. No video leaves your machine.
        </p>
      </div>
      <InstrumentSidebar side="right" onSelect={onSelectInstrument} />
    </div>
  );
}