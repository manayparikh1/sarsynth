import { DEGREE_POSES } from '../music/poses';
import type { Snapshot, SceneHands } from '../perform/performer';
import type { Point } from '../vision/hands';

export const MELODY_COLOR = '#e8a94e';
export const EXPRESSION_COLOR = '#57c9ad';

const DEVANAGARI =
    "'Kohinoor Devanagari','Noto Sans Devanagari','Devanagari Sangam MN','Nirmala UI',sans-serif";
const MONO = "'SFMono-Regular',ui-monospace,'JetBrains Mono',Menlo,monospace";

const SKELETON: [number, number][] = [
    [0, 1], [1, 2], [2, 3], [3, 4],
    [0, 5], [5, 6], [6, 7], [7, 8],
    [5, 9], [9, 10], [10, 11], [11, 12],
    [9, 13], [13, 14], [14, 15], [15, 16],
    [13, 17], [17, 18], [18, 19], [19, 20],
    [0, 17],
];

const TIPS = new Set([4, 8, 12, 16, 20]);

/** Matches MARGIN in the performer so the drawn ribbon is the played ribbon. */
const MARGIN = 0.09;

export interface SceneLabel {
    roman: string;
    devanagari: string;
    variant: 'shuddha' | 'komal' | 'tivra';
    upper: boolean;
}

export interface SceneInput {
    hands: SceneHands;
    snap: Snapshot;
    labels: SceneLabel[];
    showSkeleton: boolean;
    /** Expression-hand height below which nothing sounds. */
    threshold: number;
    /** How many degrees the seven poses can reach in this scale. */
    reachable: number;
    /** Video pixel dimensions, for undoing the cover crop. */
    videoWidth: number;
    videoHeight: number;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
}

function ribbonGeometry(w: number, h: number, cells: number) {
    const width = w * (1 - 2 * MARGIN);
    const left = w * MARGIN;
    // Cell centres sit at the ends, so the playable span reaches the edges.
    const step = cells > 1 ? width / (cells - 1) : 0;
    const cellW = Math.min(step * 0.86, 96);
    // Height has to follow width, or a narrow window gives tall thin cells with
    // labels spilling out of them.
    const cellH = Math.max(34, Math.min(h * 0.15, 116, cellW * 1.5));
    const top = h * 0.8 - cellH / 2;
    return { left, width, step, cellW, cellH, top, centerY: top + cellH / 2 };
}

export function drawScene(ctx: CanvasRenderingContext2D, w: number, h: number, input: SceneInput) {
    const { hands, snap, labels } = input;
    ctx.clearRect(0, 0, w, h);

    const project = makeProjector(input.videoWidth, input.videoHeight, w, h);

    drawOctaveLadder(ctx, h, snap.octave);
    drawRibbon(ctx, w, h, labels, snap, input.reachable);
    drawIntensityMeter(ctx, w, h, snap, input.threshold);

    if (input.showSkeleton) {
        if (hands.expression.present) {
            drawHand(ctx, hands.expression.landmarks, project, EXPRESSION_COLOR, hands.expression.stale);
            drawToneLean(ctx, hands.expression.landmarks, project, snap.tone);
            drawRoleTag(
                ctx,
                hands.expression.landmarks,
                project,
                EXPRESSION_COLOR,
                snap.articulation,
                hands.expression.fingers,
                snap.sustain
            );
        }
        if (hands.swara.present) {
            drawHand(ctx, hands.swara.landmarks, project, MELODY_COLOR, hands.swara.stale);
            drawGamak(ctx, hands.swara.landmarks, project, snap.gamak);
            const name = snap.degree !== null ? (labels[snap.degree]?.roman ?? '—') : 'rest';
            drawRoleTag(
                ctx,
                hands.swara.landmarks,
                project,
                MELODY_COLOR,
                name.toLowerCase(),
                hands.swara.fingers,
                null
            );
        }
    }
}

function makeProjector(vw: number, vh: number, w: number, h: number) {
    if (!vw || !vh) return (p: Point) => ({ x: p.x * w, y: p.y * h });
    const scale = Math.max(w / vw, h / vh);
    const dw = vw * scale;
    const dh = vh * scale;
    const ox = (w - dw) / 2;
    const oy = (h - dh) / 2;
    return (p: Point) => ({ x: ox + p.x * dw, y: oy + p.y * dh });
}

//------

function drawPoseGlyph(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    pose: readonly boolean[],
    size: number,
    color: string,
    dim: string
) {
    const gap = size * 2.1;
    const left = cx - (gap * (pose.length - 1)) / 2;
    for (let i = 0; i < pose.length; i++) {
        ctx.beginPath();
        ctx.arc(left + gap * i, cy, size, 0, Math.PI * 2);
        ctx.fillStyle = pose[i] ? color : dim;
        ctx.fill();
    }
}
function drawRibbon(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    labels: SceneLabel[],
    snap: Snapshot,
    reachable: number
) {
    const cells = labels.length;
    const g = ribbonGeometry(w, h, cells);
    ctx.save();
    ctx.strokeStyle = 'rgba(232,169,78,0.14)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(g.left, g.centerY);
    ctx.lineTo(g.left + g.width, g.centerY);
    ctx.stroke();
    ctx.restore();

    for (let i = 0; i < cells; i++) {
        const cx = g.left + g.step * i;
        const x = cx - g.cellW / 2;
        const active = snap.degree === i;
        const lit = active && snap.playing;
        const label = labels[i];

        const out = i >= reachable;

        ctx.save();
        if (out) ctx.globalAlpha = 0.32;
        if (lit) {
            ctx.shadowColor = MELODY_COLOR;
            ctx.shadowBlur = 26;
        }
        roundRect(ctx, x, g.top, g.cellW, g.cellH, 12);
        ctx.fillStyle = lit
            ? 'rgba(232,169,78,0.26)'
            : active
                ? 'rgba(232,169,78,0.10)'
                : 'rgba(18,14,10,0.5)';
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = lit
            ? 'rgba(255,209,138,0.95)'
            : active
                ? 'rgba(232,169,78,0.55)'
                : 'rgba(232,169,78,0.18)';
        ctx.lineWidth = lit ? 2 : 1;
        ctx.stroke();
        ctx.restore();

        const cy = g.centerY;
        const H = g.cellH;
        ctx.save();
        if (out) ctx.globalAlpha = 0.32;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';

        ctx.font = `${Math.round(H * 0.3)}px ${DEVANAGARI}`;
        ctx.fillStyle = lit ? '#fff1d6' : active ? '#f0c079' : 'rgba(232,169,78,0.62)';
        ctx.fillText(label.devanagari, cx, cy - H * 0.02);

        ctx.font = `${Math.round(H * 0.14)}px ${MONO}`;
        ctx.fillStyle = lit ? 'rgba(255,241,214,0.9)' : 'rgba(232,169,78,0.45)';
        ctx.fillText(label.roman.toLowerCase(), cx, cy + H * 0.21);

        if (label.variant !== 'shuddha') {
            const komal = label.variant === 'komal';
            ctx.strokeStyle = komal ? 'rgba(120,190,255,0.85)' : 'rgba(255,140,120,0.9)';
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            if (komal) {
                ctx.moveTo(cx - H * 0.1, cy + H * 0.04);
                ctx.lineTo(cx + H * 0.1, cy + H * 0.04);
            } else {
                ctx.moveTo(cx, cy - H * 0.4);
                ctx.lineTo(cx, cy - H * 0.31);
            }
            ctx.stroke();
        }
        //The finger shqape that names this swara soda mapping is on screen rather than in the players memory.//

        if (i < DEGREE_POSES.length && H > 46) {
            drawPoseGlyph(
                ctx,
                cx,
                cy + H * 0.37,
                DEGREE_POSES[i],
                Math.max(1.5, H * 0.026),
                lit ? '#ffe1ac' : active ? '#f0c079' : 'rgba(232,169,78,0.7)',
                'rgba(232,169,78,0.16)'
            );
        }
        ctx.restore();
    }
}
function drawOctaveLadder(ctx: CanvasRenderingContext2D, h: number, octave: number) {

    const bands: { from: number; to: number; value: number; label: string; roman: string }[] = [

        { from: 0.08, to: 0.36, value: 1, label: 'तार', roman: 'taar' },
        { from: 0.36, to: 0.66, value: 0, label: 'मध्य', roman: 'madhya' },
        { from: 0.66, to: 0.92, value: -1, label: 'मंद्र', roman: 'mandra' },
    ];

    const x = 26;
    const bw = 8;
    //ribbon - bottom of screen//
    const floor = h * 0.7;

    for (const b of bands) {
        const y = h * b.from;
        const bh = Math.min(h * b.to, floor) - y - 8;
        if (bh <= 0) continue;
        const on = b.value === octave;
        ctx.save();
        roundRect(ctx, x, y, bw, bh, bw / 2);
        ctx.fillStyle = on ? 'rgba(87,201,173,0.75)' : 'rgba(87,201,173,0.13)';
        if (on) {
            ctx.shadowColor = EXPRESSION_COLOR;
            ctx.shadowBlur = 14;
        }
        ctx.fill();
        ctx.restore();
        ctx.save();
        ctx.translate(x + bw + 16, y + bh / 2);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.font = `13px ${DEVANAGARI}`;
        ctx.fillStyle = on ? 'rgba(190,245,232,0.95)' : 'rgba(87,201,173,0.35)';
        ctx.fillText(b.label, 0, -7);
        ctx.font = `9px ${MONO}`;
        ctx.fillStyle = on ? 'rgba(190,245,232,0.6)' : 'rgba(87,201,173,0.25)';
        ctx.fillText(b.roman, 0, 7);
        ctx.restore();
    }
}

function drawIntensityMeter(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    snap: Snapshot,
    threshold: number
) {
    const x = w - 34;
    const top = h * 0.18;
    const height = h * 0.5;
    ctx.save();
    roundRect(ctx, x, top, 6, height, 3);
    ctx.fillStyle = 'rgba(232,169,78,0.12)';
    ctx.fill();

    const filled = height * snap.intensity;
    roundRect(ctx, x, top + height - filled, 6, filled, 3);
    ctx.fillStyle = snap.playing ? 'rgba(255,206,132,0.9)' : 'rgba(232,169,78,0.3)';
    ctx.fill();

    // The line the hand has to cross for anything to sound.
    const ty = top + height - height * threshold;
    ctx.beginPath();
    ctx.moveTo(x - 5, ty);
    ctx.lineTo(x + 11, ty);
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.translate(x - 10, top + height + 18);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'left';
    ctx.font = `9px ${MONO}`;
    ctx.fillStyle = 'rgba(232,169,78,0.4)';
    ctx.fillText('VOLUME', 0, 0);
    ctx.restore();
}

function drawHand(
    ctx: CanvasRenderingContext2D,
    lm: Point[],
    project: (p: Point) => Point,
    color: string,
    stale: boolean
) {
    if (lm.length < 21) return;
    const pts = lm.map(project);

    ctx.save();
    // A held-over hand fades rather than vanishing, so brief tracking dropouts
    // read as a flicker instead of the instrument disappearing.
    if (stale) ctx.globalAlpha = 0.4;
    ctx.strokeStyle = `${color}88`;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (const [a, b] of SKELETON) {
        ctx.moveTo(pts[a].x, pts[a].y);
        ctx.lineTo(pts[b].x, pts[b].y);
    }
    ctx.stroke();

    for (let i = 0; i < pts.length; i++) {
        ctx.beginPath();
        ctx.arc(pts[i].x, pts[i].y, TIPS.has(i) ? 4 : 2.4, 0, Math.PI * 2);
        ctx.fillStyle = TIPS.has(i) ? color : `${color}99`;
        ctx.fill();
    }
    ctx.restore();
}

/**
 * Under each hand: what it is currently doing, plus a live readout of which
 * fingers the tracker thinks are up. Seeing the detected pose is the fastest
 * way to work out why a swara is not coming out.
 */
function drawRoleTag(
    ctx: CanvasRenderingContext2D,
    lm: Point[],
    project: (p: Point) => Point,
    color: string,
    text: string,
    fingers: readonly boolean[],
    sustain: boolean | null
) {
    if (lm.length < 21) return;
    const wrist = project(lm[0]);
    const label = sustain === null ? text : `${text}${sustain ? ' · ring' : ' · damp'}`;
    ctx.save();
    ctx.font = `10px ${MONO}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const w = Math.max(ctx.measureText(label).width + 16, 62);
    const y = wrist.y + 30;
    roundRect(ctx, wrist.x - w / 2, y - 10, w, 34, 10);
    ctx.fillStyle = 'rgba(10,8,6,0.78)';
    ctx.fill();
    ctx.strokeStyle = `${color}55`;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.fillText(label, wrist.x, y);
    drawPoseGlyph(ctx, wrist.x, y + 15, fingers, 2.4, color, 'rgba(255,255,255,0.16)');
    ctx.restore();
}

/** An arc off the expression hand showing how far it is leaned for tone. */
function drawToneLean(
    ctx: CanvasRenderingContext2D,
    lm: Point[],
    project: (p: Point) => Point,
    tone: number
) {
    if (Math.abs(tone) < 0.04 || lm.length < 21) return;
    const wrist = project(lm[0]);
    ctx.save();
    ctx.strokeStyle = `rgba(87,201,173,${0.25 + Math.abs(tone) * 0.6})`;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    const start = -Math.PI / 2;
    ctx.arc(wrist.x, wrist.y, 42, start, start + tone * 1.5, tone < 0);
    ctx.stroke();
    ctx.restore();
}

/** A wave beside the swara hand whose depth tracks the gamak amount. */
function drawGamak(ctx: CanvasRenderingContext2D, lm: Point[], project: (p: Point) => Point, gamak: number) {
    if (gamak < 0.03 || lm.length < 21) return;
    const wrist = project(lm[0]);
    const amp = 4 + gamak * 20;
    ctx.save();
    ctx.strokeStyle = `rgba(232,169,78,${0.35 + gamak * 0.55})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= 60; i++) {
        const t = i / 60;
        const px = wrist.x - 60 + t * 120;
        const py = wrist.y + 46 + Math.sin(t * Math.PI * 4 + performance.now() / 90) * amp;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();
}
