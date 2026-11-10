import { useEffect, useRef, useState } from "react";
import { claimDailyReward, fetchDailyRewardStatus, fetchProgress } from "../api/backend";
import { BackendError } from "../api/client";
import type { DailyRewardStatus } from "../api/types";
import { ResourceIcon } from "../components/ResourceIcon";
import {
  claimKey,
  clearClaimKey,
  noteDailyClaim,
  resetClock,
  streakCount,
  weekReward,
  type RewardPart,
} from "../game/dailyRewards";
import { useSession } from "../session/SessionContext";
import { useSettings } from "../settings/SettingsContext";
import { useWallet } from "../wallet/WalletContext";
import "./DailyReward.css";

const WEEK_DAYS = [1, 2, 3, 4, 5, 6] as const;

function PrizeList({ parts }: { parts: RewardPart[] }) {
  return (
    <>
      {parts.map((part) => (
        <span className="daily__prize" key={part.kind}>
          <ResourceIcon kind={part.kind} />
          <span className="daily__amount">{part.amount}</span>
        </span>
      ))}
    </>
  );
}

function dayMark(day: number, cycleDay: number, available: boolean): "done" | "today" | "" {
  if (day < cycleDay) {
    return "done";
  }
  if (day === cycleDay) {
    return available ? "today" : "done";
  }
  return "";
}

type DailyRewardModalProps = {
  status: DailyRewardStatus | null;
  claimedDays: number;
  busy: boolean;
  error: string | null;
  onClaim: () => void;
  onClose: () => void;
};

export function DailyRewardModal({
  status,
  claimedDays,
  busy,
  error,
  onClaim,
  onClose,
}: DailyRewardModalProps) {
  const { t } = useSettings();
  const fill = Math.min(30, Math.max(0, claimedDays));
  const cycleDay = status?.cycleDay ?? 0;
  const available = status?.available ?? false;
  const finale = status ? dayMark(7, cycleDay, available) : "";

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="daily" onClick={onClose}>
      <section
        className="daily__sheet"
        role="dialog"
        aria-modal="true"
        aria-label={t("dailyTitle")}
        onClick={(event) => event.stopPropagation()}
      >
        <h1 className="daily__title">{t("dailyTitle")}</h1>
        {status?.nextResetAt ? (
          <p className="daily__next">
            {t("dailyNext")}
            <span className="daily__clock">
              <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                <circle cx="8" cy="8" r="6.2" fill="none" stroke="#3a2418" strokeWidth="1.8" />
                <path d="M8 4.2V8l2.4 1.6" fill="none" stroke="#3a2418" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              {resetClock(status.nextResetAt)}
            </span>
          </p>
        ) : null}

        <div className="daily__board">
          <ol className="daily__days">
            {WEEK_DAYS.map((day) => {
              const parts = weekReward(day, cycleDay, status?.reward ?? {});
              const state = status ? dayMark(day, cycleDay, available) : "";
              return (
                <li
                  key={day}
                  className={state ? `daily__day daily__day--${state}` : "daily__day"}
                >
                  <p className="daily__cap">
                    {t("dailyDay")} {day}
                  </p>
                  <div className={parts.length > 1 ? "daily__body daily__body--pair" : "daily__body"}>
                    <PrizeList parts={parts} />
                  </div>
                </li>
              );
            })}
          </ol>

          <article
            className={
              finale ? `daily__finale daily__finale--${finale}` : "daily__finale"
            }
          >
            <p className="daily__finale-cap">
              {t("dailyDay")} 7
            </p>
            <div className="daily__finale-body">
              <PrizeList parts={weekReward(7, cycleDay, status?.reward ?? {})} />
            </div>
          </article>
        </div>

        <div className="daily__track">
          <span className="daily__track-label">
            {t("dailyDays")}: {fill}/30
          </span>
          <div className="daily__bar" aria-hidden="true">
            <div className="daily__fill" style={{ width: `${(fill / 30) * 100}%` }} />
          </div>
          <span className="daily__goal">
            <ResourceIcon kind="diamond" />
            30
          </span>
        </div>

        {error ? <p className="daily__error">{error}</p> : null}
        <button
          className="daily__claim"
          type="button"
          disabled={busy}
          onClick={available ? onClaim : onClose}
        >
          {available ? t("dailyClaim") : status ? t("dailyGot") : t("close")}
        </button>
      </section>
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M3 10h18" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M8 3v4M16 3v4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <rect x="7" y="13" width="3" height="3" fill="currentColor" />
      <rect x="12" y="13" width="3" height="3" fill="currentColor" />
    </svg>
  );
}

export function DailyRewardControl() {
  const { session, status } = useSession();
  const { replaceResources } = useWallet();
  const { t } = useSettings();
  const [reward, setReward] = useState<DailyRewardStatus | null>(null);
  const [open, setOpen] = useState(false);
  const [claimedDays, setClaimedDays] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prompted = useRef(false);

  useEffect(() => {
    prompted.current = false;
    setReward(null);
    setOpen(false);
  }, [session?.userId]);

  useEffect(() => {
    if (status !== "online" || !session) {
      return;
    }
    let cancelled = false;
    void fetchDailyRewardStatus(session.userId)
      .then((next) => {
        if (cancelled) {
          return;
        }
        setClaimedDays(streakCount(session.userId));
        setReward(next);
        if (next.available && !prompted.current) {
          prompted.current = true;
          setOpen(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setReward(null);
          setOpen(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [session, status]);

  const claim = () => {
    if (!session || !reward || !reward.available || busy) {
      return;
    }
    const userId = session.userId;
    const serverDate = reward.serverDate;
    setBusy(true);
    setError(null);
    const key = claimKey(userId);
    void claimDailyReward(userId, key)
      .then((result) => {
        replaceResources(result.resources);
        noteDailyClaim(userId, serverDate);
        clearClaimKey(userId);
        setClaimedDays(streakCount(userId));
        setReward((current) => (current ? { ...current, available: false } : current));
        setOpen(false);
      })
      .catch((err: unknown) => {
        if (err instanceof BackendError && err.code === "DAILY_REWARD_ALREADY_CLAIMED") {
          clearClaimKey(userId);
          noteDailyClaim(userId, serverDate);
          void fetchProgress(userId)
            .then((progress) => replaceResources(progress.resources))
            .catch(() => undefined);
          void fetchDailyRewardStatus(userId)
            .then((next) => {
              setClaimedDays(streakCount(userId));
              setReward(next);
              setOpen(next.available);
            })
            .catch(() => setOpen(false));
          return;
        }
        if (!(err instanceof BackendError) || err.code !== "NETWORK_ERROR") {
          clearClaimKey(userId);
        }
        setError(t("dailyError"));
      })
      .finally(() => setBusy(false));
  };

  const unclaimed = reward?.available ? 1 : 0;

  return (
    <>
      <button
        type="button"
        className="game__calendar"
        aria-label={t("dailyCalendar")}
        title={t("dailyCalendar")}
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        <CalendarIcon />
        {unclaimed > 0 ? <span className="game__calendar-badge">{unclaimed}</span> : null}
      </button>
      {open ? (
        <DailyRewardModal
          status={reward}
          claimedDays={claimedDays}
          busy={busy}
          error={error}
          onClaim={claim}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
