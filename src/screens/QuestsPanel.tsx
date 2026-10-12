import { useEffect } from "react";
import { McButton } from "../components/McButton";
import { useSettings } from "../settings/SettingsContext";
import "./QuestsPanel.css";

const QUESTS = [
  { key: "questBreak" as const, reward: "5" },
  { key: "questBuy" as const, reward: "10" },
  { key: "questRate" as const, reward: "8" },
];

type QuestsPanelProps = {
  onClose: () => void;
};

export function QuestsPanel({ onClose }: QuestsPanelProps) {
  const { t } = useSettings();

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
    <aside className="quest-panel" aria-label={t("quests")}>
      <p className="quest-panel__title">{t("quests")}</p>
      <ul className="quest-panel__list">
        {QUESTS.map((quest) => (
          <li key={quest.key} className="quest-card">
            <p className="quest-card__name">{t(quest.key)}</p>
            <p className="quest-card__reward">
              {t("questReward")}: {quest.reward}
            </p>
          </li>
        ))}
      </ul>
      <McButton slim onClick={onClose}>
        {t("close")}
      </McButton>
    </aside>
  );
}
