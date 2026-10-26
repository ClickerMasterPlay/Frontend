import { McButton } from "../components/McButton";
import { formatStones } from "../game/levels";
import {
  QUESTS,
  questReady,
  questSnapshot,
  questTitle,
  questValue,
  visibleQuests,
} from "../game/quests";
import { useSettings } from "../settings/SettingsContext";
import { useWallet } from "../wallet/WalletContext";

export function QuestBoard() {
  const { t, settings } = useSettings();
  const { quest, blocksBroken, stoneIndex, power, claimQuest } = useWallet();
  const russian = settings.language === "ru";
  const snapshot = questSnapshot(quest, blocksBroken, stoneIndex, power);
  const shown = visibleQuests(quest.claimed);

  if (shown.length === 0) {
    return <p className="quest-row__name">{t("questDoneAll")}</p>;
  }

  return (
    <ul className="game__quest-list">
      {shown.map((item) => {
        const current = Math.min(questValue(snapshot, item), item.goal);
        const ready = questReady(snapshot, item);
        const goalText = formatStones(item.goal, russian);
        const width = Math.max(0, Math.min(100, (current / item.goal) * 100));
        return (
          <li key={item.index} className="quest-row">
            <div className="quest-row__main">
              <p className="quest-row__name">{questTitle(item, goalText, russian)}</p>
              <p className="quest-row__meta">
                {t("questNumber")} {item.index + 1}/{QUESTS.length}
                {" · "}
                {t("questReward")}: {formatStones(item.reward, russian)} {t("stonesShort")}
              </p>
              <div className="quest-row__bar" aria-hidden="true">
                <span style={{ width: `${width}%` }} />
              </div>
            </div>
            {ready ? (
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
                {formatStones(current, russian)}/{goalText}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
