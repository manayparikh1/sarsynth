import { SargamEngine } from '../audio/engine';
import { SA_OCTAVE_SHIFT, TONICS, scaleById, tanpuraSemitones } from '../music/ragas';
import { articulationFor, poseToDegree, type Articulation } from '../music/poses';
import { pitchOf, type Tuning } from '../music/swaras';
import { EMPTY_HAND, HandTracker, type HandsFrame, type HandState } from '../vision/hands';

export class Debounced<T> {
    private committed: T | null = null;
    private candidate: T | null = null;
    private candidateAt = 0;
    private lastValidAt = -Infinity;

    private readonly stableMs: number;
    private readonly graceMs: number;
    private readonly equals: (a: T, b: T) => boolean;
    constructor(stableMs = 90, graceMs = 120, equals: (a: T, b: T) => boolean = Object.is) {
        this.stableMs = stableMs;
        this.graceMs = graceMs;
        this.equals = equals;
    }
    update(reading: T | null, now: number): T | null {
        if (reading !== null) this.lastValidAt = now;

        const value = reading === null && now - this.lastValidAt < this.graceMs ? this.candidate : reading;

        const same =
            value === null || this.candidate === null
                ? value === this.candidate
                : this.equals(value, this.candidate);

        if (!same) {
            this.candidate = value;
            this.candidateAt = now;
        }
        if (now - this.candidateAt >= this.stableMs) this.committed = this.candidate;
        return this.committed;
    }
    get value(): T | null {
        return this.committed;
    }
    reset(to: T | null = null) {
        this.committed = to;
        this.candidate = to;
        this.candidateAt = 0;
        this.lastValidAt = -Infinity;
    }
}
export interface PerformerConfig {
    scaleId: string;
    tonicIndex: number;
    instrumentId: string;
    tuning: Tuning;
    meend: number;
    swapHands: boolean;
    swapRoles: boolean;
    threshold: number;
    masterVolume: number;
    reverb: number;
    droneOn: boolean;
    droneLevel: number;
    showCamera: boolean;
    showSkeleton: boolean;
}

export const DEFAULT_CONFIG: PerformerConfig = {
    scaleId: 'yaman',
    tonicIndex: 0,
    instrumentId: 'sitar',
    tuning: 'just',
    meend: 0.07,
    swapHands: false,
    swapRoles: false,
    threshold: 0.08,
    masterVolume: 0.85,
    reverb: 0.3,
    droneOn: false,
    droneLevel: 0.3,
    showCamera: true,
    showSkeleton: true,
};
export interface Snapshot {
    degree: number | null;
    swaraIndex: number;
    playing: boolean;
    octave: number;
    gamak: number;
    articulation: Articulation;
    sustain: boolean;
    intensity: number;
    tone: number;
    droneOn: boolean;
    freq: number;
    swaraHandSeen: boolean;
    expressionHandSeen: boolean;
    fps: number;
    level: number;
}
export interface SceneHands {
    swara: HandState;
    expression: HandState;
}
// Narrower band than a full arm's-length reach, so volume swings fully
// within a comfortable range instead of draining out as the hand drifts.
const VOL_BOTTOM = 0.8;
const VOL_TOP = 0.3;
const JHALA_MS = 105;
const MURKI_MS = 85;
function clamp(v: number, lo: number, hi: number) {
    return v < lo ? lo : v > hi ? hi : v;
}

export class Performer {
    config: PerformerConfig = { ...DEFAULT_CONFIG };
    readonly tracker = new HandTracker();
    engine: SargamEngine | null = null;

    private video: HTMLVideoElement | null = null;
    private raf = 0
    private running = false;


    private degreeGate = new Debounced<number>(60, 170);
    private octaveGate = new Debounced<number>(110, 140);
    private articGate = new Debounced<number>(110, 140);
    private sustainGate = new Debounced<number>(140, 160);
    private degree: number | null = null;
    private octave = 0;
    private articulation: Articulation = 'plain';
    private sustain = true;
    private sounding = false;
    private soundingDegree: number | null = null;
    private soundingOctave = 0;
    private intensity = 0;
    private tone = 0;
    private gamak = 0;
    private freq = 0;
    private ornamentAt = 0;
    private murkiUp = false;
    private keysDown: number[] = [];
    private keyboardActive = false;
    private pointerDegree: number | null = null;
    private prompt: { degree: number; until: number } | null = null;
    private frames = 0;
    private fpsAt = 0;
    private fps = 0;
    private levelData = new Uint8Array(0);
    private hands: SceneHands = { swara: EMPTY_HAND, expression: EMPTY_HAND };
    private snapshot: Snapshot = {
        degree: null,
        swaraIndex: 0,
        playing: false,
        octave: 0,
        gamak: 0,
        articulation: 'plain',
        sustain: true,
        intensity: 0,
        tone: 0,
        droneOn: false,
        freq: 0,
        swaraHandSeen: false,
        expressionHandSeen: false,
        fps: 0,
        level: 0,
    };
    onFrame: ((hands: SceneHands, snap: Snapshot) => void) | null = null;

    get ribbon(): number[] {
        return scaleById(this.config.scaleId).semitones;
    }

    get cells(): number {
        return this.ribbon.length;
    }
    get reachable(): number {
        return Math.min(this.cells, 7);
    }
    get saHz(): number {
        return TONICS[this.config.tonicIndex].hz * Math.pow(2, SA_OCTAVE_SHIFT);
    }

    private freqForDegree(degree: number, octaveOffset = 0): number {
        const ribbon = this.ribbon;
        const base = this.saHz * Math.pow(2, this.octave + octaveOffset);
        return pitchOf(base, ribbon[clamp(degree, 0, ribbon.length - 1)], this.config.tuning);
    }
    async initAudio() {
        if (this.engine) return;
        this.engine = await SargamEngine.create();
        this.engine.setInstrument(this.config.instrumentId);
        this.levelData = new Uint8Array(this.engine.analyser.frequencyBinCount);
        this.applyConfig(this.config);
    }

    async initVision(video: HTMLVideoElement) {
        this.video = video;
        if (!this.tracker.loaded) await this.tracker.load();
    }

    applyConfig(next: PerformerConfig) {
        const prev = this.config;
        this.config = next;
        if (!this.engine) return;

        if (prev.instrumentId !== next.instrumentId) {
            this.engine.setInstrument(next.instrumentId);
            this.sounding = false;
        }
        this.engine.applySettings({
            masterVolume: next.masterVolume,
            reverb: next.reverb,
            droneLevel: next.droneLevel,
        });
        if (next.droneOn !== this.engine.droneOn) {
            this.engine.setDrone(next.droneOn, next.droneLevel);
        }
        this.retune();
    }
    retune() {
        if (!this.engine) return;
        const scale = scaleById(this.config.scaleId);
        const sa = this.saHz;
        this.engine.setDroneTuning(
            tanpuraSemitones(scale).map((s) => pitchOf(sa, s, this.config.tuning))
        );
        const swaraFreqs = scale.semitones.map((s) => pitchOf(sa, s, this.config.tuning));
        this.engine.setSympatheticTuning([...swaraFreqs, ...swaraFreqs.map((f) => f * 2)]);
    }
    private onVisibility = () => {
        if (!document.hidden) return;
        this.pointerDegree = null;
        this.keysDown = [];
        this.keyboardActive = false;
        this.engine?.dampAll();
        this.sounding = false;
    };
    start() {
        if (this.running) return;
        this.running = true;
        this.fpsAt = performance.now();
        document.addEventListener('visibilitychange', this.onVisibility);
        const tick = () => {
            if (!this.running) return;
            this.step(performance.now());
            this.raf = requestAnimationFrame(tick);
        };
        this.raf = requestAnimationFrame(tick);
    }
    stop() {
        this.running = false;
        cancelAnimationFrame(this.raf);
        document.removeEventListener('visibilitychange', this.onVisibility);
        this.engine?.dampAll();
    }
    dispose() {
        this.stop();
        this.tracker.close();
        this.engine?.dispose();
        this.engine = null;
    }

    keyDown(index: number) {
        if (this.keysDown.includes(index)) return;
        this.keysDown.push(index);
        this.keyboardActive = true;
    }

    keyUp(index: number) {
        this.keysDown = this.keysDown.filter((k) => k !== index);
        if (this.keysDown.length === 0) this.keyboardActive = false;
    }

    setPointerDegree(degree: number | null) {
        this.pointerDegree = degree;
    }
    /** Sound a swara with no hands involved — how the games ask a question. */
    playPrompt(degree: number, ms = 550) {
        this.prompt = { degree, until: performance.now() + ms };
    }

    get prompting() {
        return this.prompt !== null;
    }
    shiftOctave(delta: number) {
        this.octave = clamp(this.octave + delta, -1, 1);
        this.octaveGate.reset(this.octave);
    }
    setOctave(o: number) {
        this.octave = clamp(o, -1, 1);
        this.octaveGate.reset(this.octave);
    }
    private toViewport(nx: number, ny: number, vw: number, vh: number, w: number, h: number) {
        if (!vw || !vh || !w || !h) return { x: nx, y: ny };
        const scale = Math.max(w / vw, h / vh);
        const dw = vw * scale;
        const dh = vh * scale;
        return { x: ((w - dw) / 2 + nx * dw) / w, y: ((h - dh) / 2 + ny * dh) / h };
    }
    private step(now: number) {
        this.frames++;
        if (now - this.fpsAt >= 500) {
            this.fps = Math.round((this.frames * 1000) / (now - this.fpsAt));
            this.frames = 0;
            this.fpsAt = now;
        }

        let frame: HandsFrame = { left: EMPTY_HAND, right: EMPTY_HAND };
        if (this.video && this.tracker.loaded) {
            frame = this.tracker.detect(this.video, now, { swapHands: this.config.swapHands });
        }

        const swaraHand = this.config.swapRoles ? frame.right : frame.left;
        const expression = this.config.swapRoles ? frame.left : frame.right;
        this.hands = { swara: swaraHand, expression };

        const vw = this.video?.videoWidth ?? 0;
        const vh = this.video?.videoHeight ?? 0;
        const w = window.innerWidth;
        const h = window.innerHeight;

        let poseDegree: number | null = null;
        if (swaraHand.present) {
            const raw = poseToDegree(swaraHand.fingers);
            poseDegree = raw !== null && raw < this.reachable ? raw : null;

            const p = this.toViewport(swaraHand.x, swaraHand.y, vw, vh, w, h);
            const band = p.y < 0.36 ? 1 : p.y > 0.66 ? -1 : 0;
            const settled = this.octaveGate.update(band, now);
            if (settled !== null) this.octave = settled;

            this.gamak = clamp((Math.abs(swaraHand.tilt) - 0.08) / 0.7, 0, 1);
        } else {
            this.octaveGate.update(null, now);
            this.gamak = 0;
        }

        if (this.pointerDegree !== null) this.degree = this.pointerDegree;
        else if (this.keyboardActive) {
            this.degree = clamp(this.keysDown[this.keysDown.length - 1], 0, this.cells - 1);
        } else {
            this.degree = this.degreeGate.update(poseDegree, now);
        }

        let targetIntensity = 0;
        if (this.pointerDegree !== null || this.keyboardActive) {
            targetIntensity = 0.8;
        } else if (expression.present) {
            const p = this.toViewport(expression.x, expression.y, vw, vh, w, h);
            targetIntensity = clamp((VOL_BOTTOM - p.y) / (VOL_BOTTOM - VOL_TOP), 0, 1);
            this.tone = expression.tilt;

            const artic = this.articGate.update(expression.fingersUp, now);
            if (artic !== null) this.articulation = articulationFor(artic);
            const sus = this.sustainGate.update(expression.fingers[0] ? 1 : 0, now);
            if (sus !== null) this.sustain = sus === 1;
        } else {
            this.articGate.update(null, now);
            this.sustainGate.update(null, now);
        }

        this.intensity += (targetIntensity - this.intensity) * 0.4;
        if (this.intensity < 0.002) this.intensity = 0;

        // A game prompt takes both hands over so the phrase sounds cleanly.
        if (this.prompt) {
            if (now >= this.prompt.until) this.prompt = null;
            else {
                this.degree = this.prompt.degree;
                this.intensity = 0.75;
                this.articulation = 'plain';
            }
        }

        const engine = this.engine;
        if (engine) {
            const muted = this.articulation === 'mute';
            const want = this.degree !== null && !muted && this.intensity > this.config.threshold;

            const velocity = clamp(0.5 + this.intensity, 0, 1);

            if (want) {
                const target = this.ornamentedFreq(now);
                // Moving to a new pose is a new pluck, not a glide onto the old
                // one's decaying tail — otherwise every note after the first
                // plays quieter until the hand drops to silence and restarts.
                const newNote = this.degree !== this.soundingDegree || this.octave !== this.soundingOctave;
                if (!this.sounding || newNote) {
                    engine.setSustain(this.sustain);
                    engine.noteOn(target, velocity);
                    this.sounding = true;
                    this.soundingDegree = this.degree;
                    this.soundingOctave = this.octave;
                    this.ornamentAt = now;
                } else {
                    engine.setSustain(this.sustain);
                    if (this.articulation === 'jhala' && now - this.ornamentAt >= JHALA_MS) {
                        engine.restrike(target, velocity * 0.85);
                        this.ornamentAt = now;
                    } else {
                        engine.setFrequency(target, this.articulation === 'murki' ? 0.02 : this.config.meend);
                    }
                }
                this.freq = target;
            } else if (this.sounding) {
                if (muted) engine.dampAll();
                else engine.noteOff();
                this.sounding = false;
                this.soundingDegree = null;
            }

            engine.setIntensity(this.intensity);
            engine.setGamak(this.articulation === 'andolan' ? Math.max(this.gamak, 0.85) : this.gamak);
            engine.setTone(this.tone);
        }

        let level = 0;
        if (engine && this.levelData.length) {
            engine.analyser.getByteTimeDomainData(this.levelData);
            let sum = 0;
            for (let i = 0; i < this.levelData.length; i += 4) {
                const v = (this.levelData[i] - 128) / 128;
                sum += v * v;
            }
            level = clamp(Math.sqrt(sum / (this.levelData.length / 4)) * 3.2, 0, 1);
        }

        this.snapshot = {
            degree: this.degree,
            swaraIndex: this.degree ?? 0,
            playing: this.sounding,
            octave: this.octave,
            gamak: this.gamak,
            articulation: this.articulation,
            sustain: this.sustain,
            intensity: this.intensity,
            tone: this.tone,
            droneOn: engine?.droneOn ?? false,
            freq: this.freq,
            swaraHandSeen: swaraHand.present,
            expressionHandSeen: expression.present,
            fps: this.fps,
            level,
        };

        this.onFrame?.(this.hands, this.snapshot);
    }


    private ornamentedFreq(now: number): number {
        const d = this.degree ?? 0;
        if (this.articulation !== 'murki') return this.freqForDegree(d);
        if (now - this.ornamentAt >= MURKI_MS) {
            this.murkiUp = !this.murkiUp;
            this.ornamentAt = now;
        }
        if (!this.murkiUp) return this.freqForDegree(d);
        return d + 1 < this.cells ? this.freqForDegree(d + 1) : this.freqForDegree(0, 1);
    }
}