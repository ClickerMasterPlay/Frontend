import { useEffect, useMemo, useRef, useState } from "react";
import { McButton } from "../components/McButton";
import type { ChallengeListPayload } from "../api/types";
import { formatStones } from "../game/levels";
import {
  QUESTS,
  questReady,
  questSnapshot,
  questTitle,
  questValue,
  type QuestDef,
  type QuestKind,
} from "../game/quests";
import { useSettings } from "../settings/SettingsContext";
import { useWallet } from "../wallet/WalletContext";

const PAGE_SIZE = 12;

type QuestRow = {
  index: number;
  kind: QuestKind;
  goal: number;
  reward: number;
  current: number;
  ready: boolean;
  claimed: boolean;
  progress: number;
};

function challengeValue(
  stats: ChallengeListPayload["stats"],
  quest: QuestDef,
): number {
  switch (quest.kind) {
    case "clicks":
      return stats.clicks;
    case "break":
      return stats.blocksBroken;
    case "earn":
      return stats.earned;
    case "spend":
      return stats.spent;
    case "level":
      return stats.level;
    case "buy":
      return stats.buys;
    case "power":
      return stats.power;
    default:
      return 0;
  }
}

function sortQuestRows(rows: QuestRow[]): QuestRow[] {
  return [...rows].sort((a, b) => {
    // 1) ready to claim  2) in progress by bar  3) already claimed
    const rank = (row: QuestRow) => {
      if (row.claimed) {
        return 2;
      }
      if (row.ready) {
        return 0;
      }
      return 1;
    };
    const diff = rank(a) - rank(b);
    if (diff !== 0) {
      return diff;
    }
    if (!a.claimed && !b.claimed && !a.ready && !b.ready) {
      return b.progress - a.progress;
    }
    return a.index - b.index;
  });
}

export function QuestBoard() {
  const { t, settings } = useSettings();
  const { quest, blocksBroken, stoneIndex, power, claimQuest, challenges } = useWallet();
  const russian = settings.language === "ru";
  const [shown, setShown] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLLIElement | null>(null);

  const rows = useMemo(() => {
    const build = (item: QuestDef, currentRaw: number, ready: boolean, claimed: boolean): QuestRow => {
      const current = claimed ? item.goal : Math.min(Math.max(0, currentRaw), item.goal);
      const progress = item.goal > 0 ? current / item.goal : 0;
      return {
        index: item.index,
        kind: item.kind,
        goal: item.goal,
        reward: item.reward,
        current,
        ready: ready && !claimed,
        claimed,
        progress,
      };
    };

    if (challenges) {
      const claimedSet = new Set(challenges.claimed);
      return sortQuestRows(
        QUESTS.map((item) => {
          const claimed = claimedSet.has(item.index);
          const fromApi = challenges.items.find((row) => row.index === item.index);
          const current = claimed
            ? item.goal
            : fromApi
              ? fromApi.current
              : challengeValue(challenges.stats, item);
          // Goal met → claimable (button on top), whether or not API window listed it.
          const ready =
            !claimed &&
            (fromApi?.ready === true || current + 1e-9 >= item.goal);
          return build(item, current, ready, claimed);
        }),
      );
    }

    const snapshot = questSnapshot(quest, blocksBroken, stoneIndex, power);
    const claimedSet = new Set(quest.claimed);
    return sortQuestRows(
      QUESTS.map((item) => {
        const claimed = claimedSet.has(item.index);
        const current = claimed ? item.goal : questValue(snapshot, item);
        return build(item, current, !claimed && questReady(snapshot, item), claimed);
      }),
    );
  }, [blocksBroken, challenges, power, quest, stoneIndex]);

  useEffect(() => {
    setShown(PAGE_SIZE);
  }, [rows.length, challenges?.claimed.join(","), quest.claimed.join(",")]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || shown >= rows.length) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShown((count) => Math.min(rows.length, count + PAGE_SIZE));
        }
      },
      { root: null, rootMargin: "80px", threshold: 0 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [rows.length, shown]);

  if (rows.length === 0) {
    return <p className="quest-row__name">{t("questDoneAll")}</p>;
  }

  const visible = rows.slice(0, shown);

  return (
    <ul className="game__quest-list">
      {visible.map((item) => {
        const goalText = formatStones(item.goal, russian);
        const width = Math.max(0, Math.min(100, item.progress * 100));
        return (
          <li
            key={item.index}
            className={item.claimed ? "quest-row quest-row--done" : "quest-row"}
          >
            <div className="quest-row__main">
              <p className="quest-row__name">
                {questTitle(
                  { index: item.index, kind: item.kind, goal: item.goal, reward: item.reward },
                  goalText,
                  russian,
                )}
              </p>
              <p className="quest-row__meta">
                {item.claimed
                  ? t("questClaimed")
                  : `${t("questReward")}: ${formatStones(item.reward, russian)} ${t("stonesShort")}`}
              </p>
              <div className="quest-row__bar" aria-hidden="true">
                <span style={{ width: `${width}%` }} />
              </div>
            </div>
            {item.ready ? (
              <McButton
                slim
                onClick={() => {
                  claimQuest(item.index);
                }}
              >
                {t("questClaim")}
              </McButton>
            ) : (
              <p className="quest-row__left">
                {item.claimed
                  ? t("achDone")
                  : `${formatStones(item.current, russian)}/${goalText}`}
              </p>
            )}
          </li>
        );
      })}
      {shown < rows.length ? (
        <li ref={sentinelRef} className="quest-row__sentinel" aria-hidden="true" />
      ) : null}
    </ul>
  );
}
