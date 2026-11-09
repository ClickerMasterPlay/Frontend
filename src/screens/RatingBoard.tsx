import { useEffect, useState } from "react";
import { fetchLeaderboard, refreshLeaderboard } from "../api/backend";
import type { LeaderboardPayload } from "../api/types";
import { formatStones } from "../game/levels";
import { useSession } from "../session/SessionContext";
import { useSettings } from "../settings/SettingsContext";

function playerLabel(
  displayName: string | null,
  userId: string,
  guestLabel: string,
): string {
  if (displayName && displayName.trim()) {
    return displayName.trim();
  }
  return `${guestLabel} ${userId.slice(0, 4)}`;
}

export function RatingBoard() {
  const { t, settings } = useSettings();
  const { session, status } = useSession();
  const [board, setBoard] = useState<LeaderboardPayload | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const russian = settings.language === "ru";

  useEffect(() => {
    if (status !== "online" || !session) {
      setBoard(null);
      setLoading(false);
      setError(false);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(false);
      try {
        await refreshLeaderboard(session.userId).catch(() => undefined);
        const payload = await fetchLeaderboard(session.userId, 100);
        if (!cancelled) {
          setBoard(payload);
        }
      } catch {
        if (!cancelled) {
          setBoard(null);
          setError(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [session?.userId, status]);

  if (status !== "online" || !session) {
    return <p className="quest-row__name">{t("serverOffline")}</p>;
  }

  if (loading) {
    return <p className="quest-row__name">{t("ratingLoading")}</p>;
  }

  if (error || !board) {
    return <p className="quest-row__name">{t("ratingError")}</p>;
  }

  if (board.top.length === 0) {
    return <p className="quest-row__name">{t("ratingEmpty")}</p>;
  }

  const meInTop = board.me
    ? board.top.some((entry) => entry.userId === board.me?.userId)
    : false;

  return (
    <>
      <p className="quest-row__meta" style={{ marginBottom: 8 }}>
        {board.totalPlayers} {t("ratingPlayers")}
      </p>
      <ol className="game__rating-list">
        {board.top.map((entry) => {
          const mine = board.me && entry.userId === board.me.userId;
          return (
            <li key={entry.userId} className={mine ? "game__rating-you" : undefined}>
              <span>
                #{entry.rank}{" "}
                {mine
                  ? t("you")
                  : playerLabel(entry.displayName, entry.userId, t("guestName"))}
              </span>
              <span>{formatStones(entry.score, russian)}</span>
            </li>
          );
        })}
        {board.me && !meInTop ? (
          <li className="game__rating-you">
            <span>
              #{board.me.rank} {t("you")}
            </span>
            <span>{formatStones(board.me.score, russian)}</span>
          </li>
        ) : null}
      </ol>
    </>
  );
}
