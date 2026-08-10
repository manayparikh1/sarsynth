import { useCallback, useEffect, useRef, useState } from 'react';
import type { Performer, Snapshot } from '../perform/performer';

type GameId = 'kaan' | 'yaad' | 'daud';

const GAMES: { id: GameId; deva: string; name: string; blurb: string }[] = [
    { id: 'kaan', deva: 'कान', name: 'Ear', blurb: 'A swara sounds. Play back the one you heard.' },
    { id: 'yaad', deva: 'याद', name: 'Memory', blurb: 'Repeat the phrase. It grows by one each round.' },
    { id: 'daud', deva: 'दौड़', name: 'Race', blurb: 'Hit as many named swaras as you can in 30 seconds.' },
];

const RACE_SECONDS = 30;

const loadBest = (id: GameId) => Number(localStorage.getItem(`sargam.best.${id}`) ?? 0);
const saveBest = (id: GameId, v: number) => {
    if (v > loadBest(id)) localStorage.setItem(`sargam.best.${id}`, String(v));
};
interface Props {
    performer: Performer;
    snap: Snapshot | null;
    swaras: string[];
    onClose: () => void;
}
export function GamesPanel({ performer, snap, swaras, onClose }: Props) {
    const [game, setGame] = useState<GameId | null>(null);
    const [score, setScore] = useState(0);
    const [best, setBest] = useState(0);
    const [status, setStatus] = useState('');
    const [target, setTarget] = useState<number | null>(null);
    const [reveal, setReveal] = useState(false);
    const [revealName, setRevealName] = useState('');
    const [seq, setSeq] = useState<number[]>([]);
    const [seqPos, setSeqPos] = useState(0);
    const [showing, setShowing] = useState(false);
    const [timeLeft, setTimeLeft] = useState(RACE_SECONDS);

    const n = Math.max(1, Math.min(swaras.length, 7));
    const pick = useCallback(() => Math.floor(Math.random() * n), [n]);
    const nameOf = (d: number | null) => (d === null ? '' : (swaras[d] ?? '').toLowerCase());

    const timers = useRef<number[]>([]);
    const clearTimers = useCallback(() => {
        timers.current.forEach(clearTimeout);
        timers.current = [];
    }, []);
    const after = useCallback((ms: number, fn: () => void) => {
        timers.current.push(window.setTimeout(fn, ms));
    }, []);
    useEffect(() => clearTimers, [clearTimers]);

    const playSeq = useCallback(
        (s: number[]) => {
            setShowing(true);
            setSeqPos(0);
            s.forEach((d, i) => after(400 + i * 700, () => performer.playPrompt(d, 480)));
            after(400 + s.length * 700, () => setShowing(false));
        },
        [after, performer]
    );

    const start = useCallback(
        (id: GameId) => {
            clearTimers();
            setGame(id);
            setScore(0);
            setBest(loadBest(id));
            setStatus('');
            setReveal(false);
            if (id === 'daud') {
                setTimeLeft(RACE_SECONDS);
                setTarget(pick());
            } else if (id === 'kaan') {
                const t = pick();
                setTarget(t);
                after(400, () => performer.playPrompt(t));
            } else {
                const s = [pick()];
                setSeq(s);
                playSeq(s);
            }
        },
        [after, clearTimers, performer, pick, playSeq]
    );

    const onNote = (d: number) => {
        if (game === 'kaan') {
            if (d === target) {
                const s = score + 1;
                setScore(s);
                saveBest('kaan', s);
                setBest((b) => Math.max(b, s));
                setStatus('right');
                const t = pick();
                setTarget(t);
                after(500, () => {
                    setStatus('');
                    performer.playPrompt(t);
                });
            } else {
                setStatus(`that was ${nameOf(target)}`);
                setRevealName(nameOf(target));
                setReveal(true);
                setScore(0);
                const t = pick();
                setTarget(t);
                after(1200, () => {
                    setReveal(false);
                    setStatus('');
                    performer.playPrompt(t);
                });
            }
        } else if (game === 'yaad') {
            if (d === seq[seqPos]) {
                const p = seqPos + 1;
                if (p < seq.length) {
                    setSeqPos(p);
                } else {
                    const s = seq.length;
                    setScore(s);
                    saveBest('yaad', s);
                    setBest((b) => Math.max(b, s));
                    setStatus('again, one longer');
                    const next = [...seq, pick()];
                    setSeq(next);
                    after(800, () => {
                        setStatus('');
                        playSeq(next);
                    });
                }
            } else {
                setStatus(`broke at ${seq.length}`);
                const s = [pick()];
                setSeq(s);
                setScore(0);
                after(1200, () => {
                    setStatus('');
                    playSeq(s);
                });
            }
        } else if (game === 'daud' && timeLeft > 0) {
            if (d === target) {
                setScore((s) => s + 1);
                setTarget(pick());
            }
        }
    };

    // Held through a ref so the frame-driven effect below never fires a stale
    // copy of the game state.
    const onNoteRef = useRef(onNote);
    onNoteRef.current = onNote;

    // Ear/Memory punish a wrong note by resetting the score, so a hand merely
    // passing through a zone on its way to the target must not count. Race
    // has no such penalty, so it stays instant.
    const HOLD_MS = 160;
    const lastNote = useRef<number | null>(null);
    const pending = useRef<{ d: number; timer: number } | null>(null);
    useEffect(
        () => () => {
            if (pending.current) clearTimeout(pending.current.timer);
        },
        []
    );
    useEffect(() => {
        const d = snap && snap.playing ? snap.degree : null;
        const prev = lastNote.current;
        lastNote.current = d;

        if (pending.current && d !== pending.current.d) {
            clearTimeout(pending.current.timer);
            pending.current = null;
        }

        // Only a freshly started note counts, never a held one.
        if (d === null || d === prev || game === null) return;
        if (performer.prompting || showing) return;

        // Memory is a rapid tap sequence like Race, not a held answer like
        // Ear — it must react instantly, not wait out a hold.
        if (game === 'daud' || game === 'yaad') {
            onNoteRef.current(d);
            return;
        }
        const timer = window.setTimeout(() => {
            pending.current = null;
            onNoteRef.current(d);
        }, HOLD_MS);
        pending.current = { d, timer };
    }, [snap, game, showing, performer]);

    useEffect(() => {
        if (game !== 'daud') return;
        if (timeLeft <= 0) {
            saveBest('daud', score);
            setBest((b) => Math.max(b, score));
            return;
        }
        const t = window.setTimeout(() => setTimeLeft((x) => x - 1), 1000);
        return () => clearTimeout(t);
    }, [game, timeLeft, score]);

    if (!game) {
        return (
            <div className="panel games">
                <div className="panel-head">
                    <h2>खेल · Games</h2>
                    <button className="icon" onClick={onClose} aria-label="Close games">
                        ✕
                    </button>
                </div>
                {GAMES.map((g) => (
                    <button key={g.id} className="game-card" onClick={() => start(g.id)}>
                        <span className="game-deva">{g.deva}</span>
                        <span className="game-body">
                            <span className="game-name">{g.name}</span>
                            <span className="game-blurb">{g.blurb}</span>
                        </span>
                        <span className="game-best">{loadBest(g.id) || '—'}</span>
                    </button>
                ))}
                <p className="hint">
                    Answer with poses, by clicking the ribbon or with the A-J keys. The best scores are kept.
                </p>
            </div>
        );
    }
    const meta = GAMES.find((g) => g.id === game)!;
    return (
        <div className="panel games">
            <div className="panel-head">
                <h2>
                    {meta.deva} · {meta.name}
                </h2>
                <button
                    className="icon"
                    onClick={() => {
                        clearTimers();
                        setGame(null);
                    }}
                    aria-label="Back to games"
                >
                    ✕
                </button>
            </div>
            <div className="game-hud">
                <div className="stat">
                    <span className="stat-label">score</span>
                    <span className="stat-value">{score}</span>
                </div>
                <div className="stat">
                    <span className="stat-label">best</span>
                    <span className="stat-value">{best || '—'}</span>
                </div>
                {game === 'daud' && (
                    <div className="stat">
                        <span className="stat-label">time</span>
                        <span className="stat-value">{timeLeft}s</span>
                    </div>
                )}
            </div>
            <div className="game-stage">
                {game === 'kaan' && (
                    <>
                        <div className="game-big">{reveal ? revealName : '?'}</div>
                        <button
                            className="chip"
                            onClick={() => target !== null && performer.playPrompt(target)}
                        >
                            Hear it again
                        </button>
                    </>
                )}
                {game === 'yaad' && (
                    <>
                        <div className="game-dots">
                            {seq.map((_, i) => (
                                <i
                                    key={i}
                                    className={showing ? '' : i < seqPos ? 'done' : i === seqPos ? 'now' : ''}
                                />
                            ))}
                        </div>
                        <div className="game-big small">{showing ? 'listen' : 'your turn'}</div>
                    </>
                )}

                {game === 'daud' && (
                    <div className="game-big">{timeLeft > 0 ? nameOf(target) : "time's up"}</div>
                )}
            </div>

            {status && <p className="game-status">{status}</p>}

            <button className="chip" onClick={() => start(game)}>
                restart
            </button>
        </div>
    );
}