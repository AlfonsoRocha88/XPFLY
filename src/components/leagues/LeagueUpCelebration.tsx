import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { useProfile } from "@/hooks/useProfile";
import { LeagueEmblem } from "@/components/leagues/LeagueEmblem";
import { leagueById, leagueLabel, leagueRank, type LeagueDivision } from "@/lib/leagues";
import { playSfx } from "@/lib/sfx";

const EASE_OUT = [0.23, 1, 0.32, 1] as const;
const STORAGE_KEY = "constela:lastLeagueSeen";

const readSeen = (): string | null => {
  try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
};
const writeSeen = (id: string) => {
  try { localStorage.setItem(STORAGE_KEY, id); } catch { /* private mode: celebrate again next time, harmless */ }
};

/**
 * Decides whether moving from the last league this device saw to the current one deserves the
 * full-screen celebration. Ranks come from leagueRank(): 0 = Asteroide III … 33 = Galáctica, -1 = unknown id.
 */
export function shouldCelebrate(seenId: string | null, currentId: string): boolean {
  // No history on this device (fresh install) or a pre-migration id: just remember, don't celebrate.
  const seen = leagueRank(seenId);
  const now = leagueRank(currentId);
  if (seen < 0 || now < 0) return false;
  // Only moving up is a moment; demotions from decay stay quiet.
  return now > seen;
}

/**
 * Watches the player's stored league and, when it moves up, plays a one-off sequence:
 * a halo opens, the new emblem resolves out of a motion blur, and the name slides in.
 * Mounted once in Index; it renders nothing the rest of the time.
 */
const LeagueUpCelebration = () => {
  const { profile } = useProfile();
  const currentId = profile?.current_league_id ?? null;
  const [show, setShow] = useState<LeagueDivision | null>(null);

  useEffect(() => {
    if (!currentId) return;
    const seen = readSeen();
    if (shouldCelebrate(seen, currentId)) {
      setShow(leagueById(currentId));
      // Land the chime with the emblem coming into focus.
      window.setTimeout(() => playSfx("achievement"), 350);
    }
    writeSeen(currentId);
  }, [currentId]);

  return show ? <Sequence league={show} onDone={() => setShow(null)} /> : null;
};

const Sequence = ({ league, onDone }: { league: LeagueDivision; onDone: () => void }) => {
  const reduce = useReducedMotion();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = window.setTimeout(() => setVisible(false), 3600);
    return () => window.clearTimeout(t);
  }, []);

  const motes = useMemo(
    () => Array.from({ length: 10 }, (_, i) => {
      const a = (i / 10) * Math.PI * 2 + 0.3;
      const r = 120 + (i % 3) * 26;
      return { x: Math.cos(a) * r, y: Math.sin(a) * r, d: 0.45 + 0.04 * (i % 5) };
    }),
    [],
  );

  return createPortal(
    <AnimatePresence onExitComplete={onDone}>
      {visible && (
        <m.div
          key="league-up"
          className="fixed inset-0 z-[100] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.3 } }}
          transition={{ duration: 0.25, ease: EASE_OUT }}
          onClick={() => setVisible(false)}
          role="status"
          aria-live="polite"
          aria-label={`Subiste a ${leagueLabel(league)}`}
        >
          <div className="absolute inset-0 bg-[#070a1c]/80 backdrop-blur-md" />

          <div className="relative grid h-[22rem] w-[22rem] place-items-center">
            {/* Halo in the league's colour, opening outward */}
            <m.div
              className="absolute h-64 w-64 rounded-full"
              style={{ background: `radial-gradient(circle, ${league.color}88, transparent 68%)` }}
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1.1, opacity: 1 }}
              transition={{ duration: 0.7, ease: EASE_OUT }}
            />
            {!reduce && (
              <m.div
                className="absolute h-72 w-72 rounded-full border-2"
                style={{ borderColor: league.color }}
                initial={{ scale: 0.3, opacity: 0.9 }}
                animate={{ scale: 1.6, opacity: 0 }}
                transition={{ duration: 1.1, delay: 0.3, ease: EASE_OUT }}
              />
            )}

            {/* The emblem: comes in fast and blurred, settles sharp (motion blur) */}
            <m.div
              initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.55, y: 40, filter: "blur(16px)" }}
              animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.65, delay: 0.15, ease: EASE_OUT }}
            >
              <LeagueEmblem family={league.family} division={league.divisionNumber} size={168} />
            </m.div>

            {!reduce && motes.map((p, i) => (
              <m.span
                key={i}
                className="absolute h-1.5 w-1.5 rounded-full"
                style={{ background: league.color, boxShadow: `0 0 8px ${league.color}` }}
                initial={{ x: 0, y: 0, opacity: 0, scale: 0.5 }}
                animate={{ x: p.x, y: p.y, opacity: [0, 1, 0], scale: [0.5, 1, 0.3] }}
                transition={{ duration: 1.2, delay: p.d, ease: EASE_OUT }}
              />
            ))}
          </div>

          <m.div
            className="absolute bottom-[22%] text-center"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.5, delay: 0.6, ease: EASE_OUT }}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">Subiste a</p>
            <p className="mt-1 font-serif text-4xl font-medium" style={{ color: league.color }}>{leagueLabel(league)}</p>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export default LeagueUpCelebration;
