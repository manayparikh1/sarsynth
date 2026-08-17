import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GamesPanel } from './components/GamesPanel';
import { HelpPanel } from './components/HelpPanel';
import { InstrumentPage } from './components/InstrumentPage';
import { Readout } from './components/Readout';
import { SettingsPanel } from './components/SettingsPanel';
import { StartOverlay } from './components/StartOverlay';
import { TopBar } from './components/TopBar';
import { ToolsPage } from './tools/ToolsPage';
import { instrumentById } from './audio/instruments';
import { ALL_INSTRUMENTS } from './instrumentInfo';
import { scaleById } from './music/ragas';
import { swaraAt } from './music/swaras';
import { DEFAULT_CONFIG, Performer, type PerformerConfig, type Snapshot } from './perform/performer';
import { drawScene, type SceneLabel } from './render/scene';
import './styles.css';

type Phase = 'idle' | 'loading' | 'running' | 'error';

const KEY_ROW = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'"];

export default function App() {
  const performerRef = useRef<Performer | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastPublish = useRef(0);

  const [phase, setPhase] = useState<Phase>('idle');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [config, setConfig] = useState<PerformerConfig>(DEFAULT_CONFIG);
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showGames, setShowGames] = useState(false);
  const [instrumentPage, setInstrumentPage] = useState<string | null>(null);
  const [showTools, setShowTools] = useState(false);

  if (!performerRef.current) {
    performerRef.current = new Performer();
    // Handy for poking at the engine from the console while developing.
    if (import.meta.env.DEV) {
      (window as unknown as { performer: Performer }).performer = performerRef.current;
    }
  }
  const performer = performerRef.current;

  const labels: SceneLabel[] = useMemo(() => {
    return scaleById(config.scaleId).semitones.map((semi) => {
      const s = swaraAt(semi);
      return { roman: s.roman, devanagari: s.devanagari, variant: s.variant, upper: false };
    });
  }, [config.scaleId]);

  // The draw loop runs outside React, so it reads these through refs rather
  // than closing over state that would go stale between renders.
  const labelsRef = useRef(labels);
  labelsRef.current = labels;
  const showSkeletonRef = useRef(config.showSkeleton);
  showSkeletonRef.current = config.showSkeleton;
  const thresholdRef = useRef(config.threshold);
  thresholdRef.current = config.threshold;
  const droneOnRef = useRef(config.droneOn);
  droneOnRef.current = config.droneOn;

  // ---- config plumbing -------------------------------------------------

  const patchConfig = useCallback((patch: Partial<PerformerConfig>) => {
    setConfig((current) => {
      const next = { ...current, ...patch };
      // Each instrument slides differently: a santoor is struck and barely
      // slides at all, a sarod slides through most of a phrase.
      if (patch.instrumentId && patch.instrumentId !== current.instrumentId) {
        next.meend = instrumentById(patch.instrumentId).preset.glide;
      }
      return next;
    });
  }, []);

  useEffect(() => {
    performer.applyConfig(config);
  }, [config, performer]);

  // ---- canvas ----------------------------------------------------------

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      canvas.getContext('2d')?.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  useEffect(() => {
    performer.onFrame = (hands, s) => {
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) {
        drawScene(ctx, window.innerWidth, window.innerHeight, {
          hands,
          snap: s,
          labels: labelsRef.current,
          showSkeleton: showSkeletonRef.current,
          threshold: thresholdRef.current,
          reachable: performer.reachable,
          videoWidth: videoRef.current?.videoWidth ?? 0,
          videoHeight: videoRef.current?.videoHeight ?? 0,
        });
      }
      // React only drives the readouts, so publish well below frame rate.
      const now = performance.now();
      if (now - lastPublish.current > 70) {
        lastPublish.current = now;
        setSnap(s);
      }
    };
    return () => {
      performer.onFrame = null;
    };
  }, [performer]);

  // ---- startup ---------------------------------------------------------

  const start = useCallback(
    async (withCamera: boolean) => {
      setPhase('loading');
      setError(null);
      try {
        setMessage('Starting the audio engine…');
        await performer.initAudio();
      } catch (e) {
        setPhase('error');
        setError(`Could not start audio: ${(e as Error).message}`);
        return;
      }

      if (withCamera) {
        try {
          setMessage('Waiting for camera permission…');
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
            audio: false,
          });
          const video = videoRef.current!;
          video.srcObject = stream;
          await video.play();
          setMessage('Loading the hand tracking model…');
          await performer.initVision(video);
          setCameraOn(true);
        } catch (e) {
          setError(
            `Camera unavailable (${(e as Error).message}). You can still play with the ribbon and keyboard — open Help for the keys.`
          );
        }
      }

      performer.applyConfig(config);
      performer.start();
      setPhase('running');
      setShowHelp(true);
    },
    [config, performer]
  );

  useEffect(() => () => performer.dispose(), [performer]);

  // ---- keyboard --------------------------------------------------------

  useEffect(() => {
    if (phase !== 'running') return;

    const isTyping = (t: EventTarget | null) =>
      t instanceof HTMLElement && ['INPUT', 'SELECT', 'TEXTAREA'].includes(t.tagName);

    const down = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || isTyping(e.target)) return;
      const key = e.key.toLowerCase();
      const idx = KEY_ROW.indexOf(key);
      if (idx >= 0 && idx < labelsRef.current.length) {
        e.preventDefault();
        performer.keyDown(idx);
        return;
      }
      if (key === 'z') performer.shiftOctave(-1);
      else if (key === 'x') performer.shiftOctave(1);
      else if (e.code === 'Space') {
        e.preventDefault();
        patchConfig({ droneOn: !droneOnRef.current });
      }
    };

    const up = (e: KeyboardEvent) => {
      const idx = KEY_ROW.indexOf(e.key.toLowerCase());
      if (idx >= 0) performer.keyUp(idx);
    };

    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [phase, performer, patchConfig]);

  // ---- pointer (plays a cell with no camera) ---------------------------

  const degreeAt = useCallback(
    (clientX: number) => {
      const n = labelsRef.current.length;
      if (n === 0) return null;
      const margin = 0.09;
      const t = (clientX / window.innerWidth - margin) / (1 - 2 * margin);
      if (t < -0.06 || t > 1.06) return null;
      const idx = Math.round(t * (n - 1));
      return Math.max(0, Math.min(Math.min(n, 7) - 1, idx));
    },
    []
  );

  const pointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      performer.setPointerDegree(degreeAt(e.clientX));
    },
    [performer, degreeAt]
  );

  const pointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (e.buttons === 0) return;
      performer.setPointerDegree(degreeAt(e.clientX));
    },
    [performer, degreeAt]
  );

  const pointerUp = useCallback(() => performer.setPointerDegree(null), [performer]);

  // ---- render ----------------------------------------------------------

  const label = snap?.degree !== null && snap?.degree !== undefined ? labels[snap.degree] : undefined;

  return (
    <div className="app">
      <video
        ref={videoRef}
        className={`camera${cameraOn && config.showCamera ? ' visible' : ''}`}
        playsInline
        muted
      />
      <div className="vignette" />
      <canvas
        ref={canvasRef}
        className="stage"
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
        onPointerCancel={pointerUp}
      />

      {phase === 'running' && (
        <>
          <TopBar
            config={config}
            onChange={patchConfig}
            onOpenHelp={() => setShowHelp(true)}
            onOpenSettings={() => setShowSettings(true)}
            onOpenGames={() => setShowGames(true)}
          />
          {snap && <Readout snap={snap} label={label} droneOn={snap.droneOn} cameraOn={cameraOn} />}
          {error && (
            <div className="banner">
              <span>{error}</span>
              <button className="icon" onClick={() => setError(null)} aria-label="Dismiss">
                ✕
              </button>
            </div>
          )}
          {showGames && (
            <GamesPanel
              performer={performer}
              snap={snap}
              swaras={labels.slice(0, 7).map((l) => l.roman)}
              onClose={() => setShowGames(false)}
            />
          )}
          {showHelp && (
            <HelpPanel
              onClose={() => setShowHelp(false)}
              swapRoles={config.swapRoles}
              cameraOn={cameraOn}
              swaras={labels.slice(0, 7).map((l) => l.roman)}
            />
          )}
          {showSettings && (
            <SettingsPanel
              config={config}
              onChange={patchConfig}
              onClose={() => setShowSettings(false)}
              cameraOn={cameraOn}
            />
          )}
        </>
      )}

      {showTools ? (
        <ToolsPage onBack={() => setShowTools(false)} />
      ) : instrumentPage ? (
        <InstrumentPage
          instrument={ALL_INSTRUMENTS.find((i) => i.name === instrumentPage)!}
          onBack={() => setInstrumentPage(null)}
        />
      ) : (
        <StartOverlay
          phase={phase}
          message={message}
          error={phase === 'error' ? error : null}
          onStart={() => void start(true)}
          onStartWithoutCamera={() => void start(false)}
          onSelectInstrument={setInstrumentPage}
          onOpenTools={() => setShowTools(true)}
        />
      )}
    </div>
  );
}
