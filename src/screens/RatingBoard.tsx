import { useEffect, useState } from "react";
import {
  acceptFriend,
  fetchFriendLeaderboard,
  fetchLeaderboard,
  fetchPendingFriends,
  inviteFriend,
  refreshLeaderboard,
} from "../api/backend";
import type { FriendPayload, LeaderboardEntry, LeaderboardPayload } from "../api/types";
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

function shownCredits(entry: LeaderboardEntry): number {
  return entry.credits;
}

function BoardList({
  board,
  russian,
  youLabel,
  guestLabel,
}: {
  board: LeaderboardPayload;
  russian: boolean;
  youLabel: string;
  guestLabel: string;
}) {
  const meInTop = board.me
    ? board.top.some((entry) => entry.userId === board.me?.userId)
    : false;

  return (
    <ol className="game__rating-list">
      {board.top.map((entry) => {
        const mine = board.me && entry.userId === board.me.userId;
        return (
          <li key={entry.userId} className={mine ? "game__rating-you" : undefined}>
            <span>
              #{entry.rank}{" "}
              {mine ? youLabel : playerLabel(entry.displayName, entry.userId, guestLabel)}
            </span>
            <span>{formatStones(shownCredits(entry), russian)}</span>
          </li>
        );
      })}
      {board.me && !meInTop ? (
        <li className="game__rating-you">
          <span>
            #{board.me.rank} {youLabel}
          </span>
          <span>{formatStones(shownCredits(board.me), russian)}</span>
        </li>
      ) : null}
    </ol>
  );
}

export function RatingBoard() {
  const { t, settings } = useSettings();
  const { session, status } = useSession();
  const [mode, setMode] = useState<"global" | "friends">("global");
  const [board, setBoard] = useState<LeaderboardPayload | null>(null);
  const [pending, setPending] = useState<FriendPayload[]>([]);
  const [friendCount, setFriendCount] = useState(0);
  const [error, setError] = useState(false);
  const [inviteError, setInviteError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const russian = settings.language === "ru";

  useEffect(() => {
    if (status !== "online" || !session) {
      setBoard(null);
      setPending([]);
      setLoading(false);
      setError(false);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setError(false);
      try {
        if (mode === "global") {
          await refreshLeaderboard(session.userId).catch(() => undefined);
          const payload = await fetchLeaderboard(session.userId, 100);
          if (!cancelled) {
            setBoard(payload);
          }
        } else {
          const [payload, invites] = await Promise.all([
            fetchFriendLeaderboard(session.userId),
            fetchPendingFriends(session.userId),
          ]);
          if (!cancelled) {
            setBoard(payload);
            setPending(invites);
            setFriendCount(payload.friendCount);
          }
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

    setBoard(null);
    setLoading(true);
    void load();
    const timer = window.setInterval(() => {
      void load();
    }, 10000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [session?.userId, status, mode]);

  const sendInvite = async () => {
    if (!session || !email.trim()) {
      return;
    }
    setInviteError(false);
    try {
      await inviteFriend(session.userId, email.trim());
      setEmail("");
    } catch {
      setInviteError(true);
    }
  };

  const accept = async (row: FriendPayload) => {
    if (!session) {
      return;
    }
    const inviterId = row.friendId === session.userId ? row.userId : row.friendId;
    try {
      await acceptFriend(session.userId, inviterId);
      const [payload, invites] = await Promise.all([
        fetchFriendLeaderboard(session.userId),
        fetchPendingFriends(session.userId),
      ]);
      setBoard(payload);
      setPending(invites);
      setFriendCount(payload.friendCount);
    } catch {
      setInviteError(true);
    }
  };

  if (status !== "online" || !session) {
    return <p className="quest-row__name">{t("serverOffline")}</p>;
  }

  return (
    <>
      <div className="game__rating-switch">
        <button
          type="button"
          className={mode === "global" ? "is-on" : undefined}
          onClick={() => setMode("global")}
        >
          {t("ratingGlobal")}
        </button>
        <button
          type="button"
          className={mode === "friends" ? "is-on" : undefined}
          onClick={() => setMode("friends")}
        >
          {t("ratingFriends")}
        </button>
      </div>

      {mode === "friends" ? (
        <>
          <form
            className="game__friend-form"
            onSubmit={(event) => {
              event.preventDefault();
              void sendInvite();
            }}
          >
            <input
              type="email"
              value={email}
              placeholder={t("friendsEmail")}
              onChange={(event) => setEmail(event.target.value)}
            />
            <button type="submit">{t("friendsInvite")}</button>
          </form>
          {inviteError ? <p className="game__friend-error">{t("friendsError")}</p> : null}
          {pending.length > 0 ? (
            <>
              <p className="quest-row__meta">{t("friendsPending")}</p>
              <ul className="game__friend-pending">
                {pending.map((row) => (
                  <li key={row.id}>
                    <span>
                      {playerLabel(
                        row.displayName ?? row.email,
                        row.userId,
                        t("guestName"),
                      )}
                    </span>
                    <button type="button" className="friend-accept" onClick={() => void accept(row)}>
                      {t("friendsAccept")}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          <p className="quest-row__meta" style={{ marginBottom: 8 }}>
            {friendCount} {t("friendsCount")}
          </p>
        </>
      ) : null}

      {loading && !board ? <p className="quest-row__name">{t("ratingLoading")}</p> : null}
      {error || !board ? (
        loading ? null : <p className="quest-row__name">{t("ratingError")}</p>
      ) : board.top.length === 0 ? (
        <p className="quest-row__name">{mode === "friends" ? t("friendsEmpty") : t("ratingEmpty")}</p>
      ) : (
        <>
          {mode === "global" ? (
            <p className="quest-row__meta" style={{ marginBottom: 8 }}>
              {board.totalPlayers} {t("ratingPlayers")}
            </p>
          ) : null}
          <BoardList
            board={board}
            russian={russian}
            youLabel={t("you")}
            guestLabel={t("guestName")}
          />
        </>
      )}
    </>
  );
}
