"use client";
import { useEffect, useState } from "react";

const KEY = "bombadil-game-seen";

/**
 * Immediate feedback after an action: a "+XP" toast, and a level-up card when
 * the level went up since the last visit. What was already seen lives only in
 * this browser; without storage the page simply shows no celebration.
 */
export function GameCelebration({ xp, level, title, achievements }: { xp: number; level: number; title: string; achievements: string[] }) {
  const [toast, setToast] = useState<string | null>(null);
  const [levelUp, setLevelUp] = useState(false);
  const [badge, setBadge] = useState<string | null>(null);

  useEffect(() => {
    let seen: { xp: number; level: number; achievements: string[] } | null = null;
    try {
      seen = JSON.parse(localStorage.getItem(KEY) ?? "null");
      localStorage.setItem(KEY, JSON.stringify({ xp, level, achievements }));
    } catch {
      return;
    }
    if (!seen) return; // first visit on this device: nothing to compare with
    const timers: ReturnType<typeof setTimeout>[] = [];
    // Deferred so the celebration renders after the page settles.
    timers.push(
      setTimeout(() => {
        if (xp > seen.xp) setToast(`+${xp - seen.xp} XP`);
        if (level > seen.level) setLevelUp(true);
        const fresh = achievements.find((a) => !seen.achievements?.includes(a));
        if (fresh) setBadge(fresh);
      }, 50),
    );
    timers.push(setTimeout(() => setToast(null), 2600));
    return () => timers.forEach(clearTimeout);
  }, [xp, level, achievements]);

  return (
    <>
      {toast ? (
        <div role="status" className="pointer-events-none fixed inset-x-0 top-20 z-50 flex justify-center">
          <span className="animate-bounce rounded-full bg-gold px-5 py-2 text-lg font-bold text-text shadow-lg">{toast}</span>
        </div>
      ) : null}
      {levelUp || badge ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-text/40 p-6" role="dialog" aria-modal="true" aria-label="Celebración">
          <div className="w-full max-w-sm rounded-3xl bg-surface p-6 text-center shadow-2xl">
            <p className="text-5xl" aria-hidden>
              {levelUp ? "⭐" : "🏅"}
            </p>
            <p className="mt-3 font-serif text-2xl font-semibold">{levelUp ? `¡Subiste al nivel ${level}!` : "¡Nueva insignia!"}</p>
            <p className="mt-1 text-muted">{levelUp ? `Ahora eres ${title}.` : badge}</p>
            <button
              type="button"
              className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-accent px-4 font-semibold text-white dark:text-bg"
              onClick={() => {
                setLevelUp(false);
                setBadge(null);
              }}
            >
              ¡Vamos!
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
