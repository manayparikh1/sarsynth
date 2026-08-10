import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { NO_FINGERS, type FingerState } from '../music/poses';



class LowPass {
    private y: number | null = null;

    filter(x: number, alpha: number): number {
        this.y = this.y === null ? x : alpha * x + (1 - alpha) * this.y;
        return this.y;
    }

    get value(): number | null {
        return this.y;
    }

    reset() {
        this.y = null;
    }
}

class OneEuroFilter {
    private x = new LowPass();
    private dx = new LowPass();
    private lastTime: number | null = null;
    private minCutoff: number;
    private beta: number;
    private dCutoff: number;

    constructor(minCutoff = 1.2, beta = 0.015, dCutoff = 1.0) {
        this.minCutoff = minCutoff;
        this.beta = beta;
        this.dCutoff = dCutoff;
    }

    private alpha(cutoff: number, dt: number): number {
        const tau = 1 / (2 * Math.PI * cutoff);
        return 1 / (1 + tau / dt);
    }

    filter(value: number, timestampMs: number): number {
        const dt = this.lastTime === null ? 1 / 60 : Math.max((timestampMs - this.lastTime) / 1000, 1 / 240);
        this.lastTime = timestampMs;

        const prev = this.x.value;
        const derivative = prev === null ? 0 : (value - prev) / dt;
        const edx = this.dx.filter(derivative, this.alpha(this.dCutoff, dt));
        const cutoff = this.minCutoff + this.beta * Math.abs(edx);
        return this.x.filter(value, this.alpha(cutoff, dt));
    }

    reset() {
        this.x.reset();
        this.dx.reset();
        this.lastTime = null;
    }
}

export interface Point {
    x: number;
    y: number;
}

export interface HandState {
    present: boolean;
    stale: boolean;
    x: number;
    y: number;

    tilt: number;
    fingers: FingerState;
    fingersUp: number;
    fist: boolean;
    landmarks: Point[];
}

export interface HandsFrame {
    left: HandState;
    right: HandState;
}

export const EMPTY_HAND: HandState = {
    present: false,
    stale: false,
    x: 0.5,
    y: 0.5,
    tilt: 0,
    fingers: NO_FINGERS,
    fingersUp: 0,
    fist: false,
    landmarks: [],
};

const WRIST = 0;
const THUMB_IP = 3;
const THUMB_TIP = 4;
const MIDDLE_MCP = 9;
const RING_MCP = 13;
const PINKY_MCP = 17;

const FINGERS: [number, number][] = [
    [8, 6],
    [12, 10],
    [16, 14],
    [20, 18],
];

const EXTEND_RATIO = 1.08;

const TILT_SPAN = 0.12;

const GRACE_MS = 160;

function dist(a: Point, b: Point): number {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp(v: number, lo: number, hi: number) {
    return v < lo ? lo : v > hi ? hi : v;
}

/** Per-hand smoothing state, kept between frames. */
class HandSmoother {
    private fx = new OneEuroFilter(1.5, 0.02);
    private fy = new OneEuroFilter(1.5, 0.02);
    private ftilt = new OneEuroFilter(1.0, 0.01);
    lastSeen = -Infinity;
    last: HandState = EMPTY_HAND;

    smooth(x: number, y: number, tilt: number, t: number) {
        return {
            x: this.fx.filter(x, t),
            y: this.fy.filter(y, t),
            tilt: this.ftilt.filter(tilt, t),
        };
    }

    reset() {
        this.fx.reset();
        this.fy.reset();
        this.ftilt.reset();
        this.last = EMPTY_HAND;
    }
}

function analyse(lm: Point[], sm: HandSmoother, t: number): HandState {
    const lo = Math.min(lm[MIDDLE_MCP].x, lm[RING_MCP].x);
    const hi = Math.max(lm[MIDDLE_MCP].x, lm[RING_MCP].x);
    const wx = lm[WRIST].x;
    let rawTilt = 0;
    if (wx < lo) rawTilt = (lo - wx) / TILT_SPAN;
    else if (wx > hi) rawTilt = (hi - wx) / TILT_SPAN;
    rawTilt = clamp(rawTilt, -1, 1);

    const s = sm.smooth(lm[MIDDLE_MCP].x, lm[MIDDLE_MCP].y, rawTilt, t);

    const wrist = lm[WRIST];
    const flags: boolean[] = [];
    flags.push(dist(lm[THUMB_TIP], lm[PINKY_MCP]) > dist(lm[THUMB_IP], lm[PINKY_MCP]) * EXTEND_RATIO);
    for (const [tip, pip] of FINGERS) {
        flags.push(dist(wrist, lm[tip]) > dist(wrist, lm[pip]) * EXTEND_RATIO);
    }
    const fingers = flags as unknown as FingerState;
    const fingersUp = flags.slice(1).filter(Boolean).length;

    return {
        present: true,
        stale: false,
        x: clamp(s.x, 0, 1),
        y: clamp(s.y, 0, 1),
        tilt: clamp(s.tilt, -1, 1),
        fingers,
        fingersUp,
        fist: fingersUp === 0 && !flags[0],
        landmarks: lm,
    };
}

export interface TrackerOptions {
    swapHands: boolean;
}

export class HandTracker {
    private landmarker: HandLandmarker | null = null;
    private mirror: HTMLCanvasElement;
    private mctx: CanvasRenderingContext2D;
    private lastVideoTime = -1;
    private smoothers = { left: new HandSmoother(), right: new HandSmoother() };
    private frame: HandsFrame = { left: EMPTY_HAND, right: EMPTY_HAND };

    constructor() {
        this.mirror = document.createElement('canvas');
        this.mirror.width = 480;
        this.mirror.height = 360;
        const c = this.mirror.getContext('2d', { willReadFrequently: false });
        if (!c) throw new Error('2D canvas unavailable');
        this.mctx = c;
    }

    async load() {
        const base = import.meta.env.BASE_URL;
        const fileset = await FilesetResolver.forVisionTasks(`${base}mediapipe/wasm`);
        this.landmarker = await HandLandmarker.createFromOptions(fileset, {
            baseOptions: {
                modelAssetPath: `${base}models/hand_landmarker.task`,
                delegate: 'GPU',
            },
            runningMode: 'VIDEO',
            numHands: 2,
            minHandDetectionConfidence: 0.5,
            minHandPresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
        });
    }

    get loaded() {
        return this.landmarker !== null;
    }


    detect(video: HTMLVideoElement, nowMs: number, opts: TrackerOptions): HandsFrame {
        if (!this.landmarker || video.readyState < 2) return this.frame;
        if (video.currentTime === this.lastVideoTime) return this.frame;
        this.lastVideoTime = video.currentTime;

        const wanted = Math.round((this.mirror.width * video.videoHeight) / video.videoWidth);
        if (wanted > 0 && this.mirror.height !== wanted) this.mirror.height = wanted;

        const w = this.mirror.width;
        const h = this.mirror.height;
        this.mctx.save();
        this.mctx.translate(w, 0);
        this.mctx.scale(-1, 1);
        this.mctx.drawImage(video, 0, 0, w, h);
        this.mctx.restore();

        const result = this.landmarker.detectForVideo(this.mirror, nowMs);

        const seen = { left: false, right: false };

        for (let i = 0; i < result.landmarks.length; i++) {
            const lm = result.landmarks[i].map((p) => ({ x: p.x, y: p.y }));
            const label = result.handedness[i]?.[0]?.categoryName ?? 'Right';
            // Inverted on purpose: see the class comment about mirrored input.
            let role: 'left' | 'right' = label === 'Left' ? 'right' : 'left';
            if (opts.swapHands) role = role === 'left' ? 'right' : 'left';
            // Two detections can land on the same label; keep the first.
            if (seen[role]) continue;
            seen[role] = true;

            const sm = this.smoothers[role];
            const state = analyse(lm, sm, nowMs);
            sm.lastSeen = nowMs;
            sm.last = state;
        }

        this.frame = {
            left: this.resolve('left', seen.left, nowMs),
            right: this.resolve('right', seen.right, nowMs),
        };
        return this.frame;
    }


    private resolve(role: 'left' | 'right', seen: boolean, now: number): HandState {
        const sm = this.smoothers[role];
        if (seen) return sm.last;
        if (sm.last.present && now - sm.lastSeen < GRACE_MS) {
            return { ...sm.last, stale: true };
        }
        if (sm.last.present) sm.reset();
        return EMPTY_HAND;
    }

    close() {
        this.landmarker?.close();
        this.landmarker = null;
    }
}

