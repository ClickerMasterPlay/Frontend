import { useState, type ReactNode } from "react";
import { GearButton } from "../components/GearButton";
import { useSession } from "../session/SessionContext";
import { useSettings } from "../settings/SettingsContext";
import { useWallet } from "../wallet/WalletContext";
import { InventoryPanel } from "./InventoryPanel";
import { MineField } from "./MineField";
import { ShopBoard } from "./ShopBoard";
import { ResourceStub } from "./ResourceStub";
import "./TitleScreen.css";
import "./GameScreen.css";

const STUB_PLAYERS = [
  { name: "Miner_7", score: "1280" },
  { name: "Guest_42", score: "910" },
  { name: "Cobble", score: "640" },
  { name: "Rookie", score: "220" },
];

const QUESTS = [
  { key: "questBreak" as const, reward: "5" },
  { key: "questBuy" as const, reward: "10" },
  { key: "questRate" as const, reward: "8" },
];

type GameTab = "shop" | "rating" | "quests";

type GameScreenProps = {
  onSettings: () => void;
  onProfile: () => void;
};

function tabFromHash(): GameTab | null {
  const hash = window.location.hash.replace("#", "");
  if (hash === "rating" || hash === "quests" || hash === "shop") {
    return hash;
  }
  return null;
}

function ProfileButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className="gear-btn" onClick={onClick} aria-label={label} title={label}>
      <svg viewBox="0 0 16 16" width="20" height="20" aria-hidden="true">
        <circle cx="8" cy="5" r="2.4" fill="currentColor" />
        <path d="M3.2 13.2c.8-2.2 2.5-3.3 4.8-3.3s4 .1 4.8 3.3" fill="currentColor" />
      </svg>
    </button>
  );
}

function RailTab({
  label,
  active,
  onClick,
  icon,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
}) {
  return (
    <button
      type="button"
      className={active ? "game__tab game__tab--on" : "game__tab"}
      aria-pressed={active}
      onClick={onClick}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

export function GameScreen({ onSettings, onProfile }: GameScreenProps) {
  const { t, settings } = useSettings();
  const { stones } = useWallet();
  const { status } = useSession();
  const [tab, setTab] = useState<GameTab | null>(tabFromHash);

  const toggleTab = (next: GameTab) => {
    setTab((current) => (current === next ? null : next));
  };

  return (
    <div className="title-screen game game--mountains">
      <div className="game__bg" />
      <div className="game__dim" />

      <div className="game__top">
        <GearButton label={t("settings")} onClick={onSettings} />
        <ProfileButton label={t("profile")} onClick={onProfile} />
        <p className={status === "online" ? "game__link game__link--on" : "game__link"}>
          {status === "online"
            ? t("serverOnline")
            : status === "checking"
              ? t("connecting")
              : t("serverOffline")}
        </p>
        <p className="game__coins">
          <span className="game__stone-icon" aria-hidden="true" />
          <span>
            {t("stones")} · {stones}
          </span>
        </p>
      </div>

      <div className="game__rail" role="tablist" aria-label={t("sections")}>
        <RailTab
          label={t("shop")}
          active={tab === "shop"}
          onClick={() => toggleTab("shop")}
          icon={
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              <path d="M4 8h16l-1.2 11H5.2L4 8z" fill="currentColor" />
              <path d="M8 8V6a4 4 0 0 1 8 0v2" fill="none" stroke="currentColor" strokeWidth="2" />
            </svg>
          }
        />
        <RailTab
          label={t("rating")}
          active={tab === "rating"}
          onClick={() => toggleTab("rating")}
          icon={
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              <path d="M7 20V10h3v10H7zm7 0V4h3v16h-3zM4 20h16v2H4z" fill="currentColor" />
            </svg>
          }
        />
        <RailTab
          label={t("quests")}
          active={tab === "quests"}
          onClick={() => toggleTab("quests")}
          icon={
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              <rect x="6" y="3" width="12" height="18" rx="1" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M9 8h6M9 12h6M9 16h4" fill="none" stroke="currentColor" strokeWidth="2" />
            </svg>
          }
        />
      </div>

      {tab ? (
        <section className="game__panel" role="tabpanel">
          <div className="game__panel-body">
            {tab === "shop" ? <ShopBoard /> : null}

            {tab === "rating" ? (
              <ol className="game__rating-list">
                {STUB_PLAYERS.map((player) => (
                  <li key={player.name}>
                    <span>{player.name}</span>
                    <span>{player.score}</span>
                  </li>
                ))}
                <li className="game__rating-you">
                  <span>{t("you")}</span>
                  <span>{t("ratingEmptyScore")}</span>
                </li>
              </ol>
            ) : null}

            {tab === "quests" ? (
              <ul className="game__quest-list">
                {QUESTS.map((quest) => (
                  <li key={quest.key} className="game__quest">
                    <span>{t(quest.key)}</span>
                    <span>
                      {t("questReward")}: {quest.reward}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          {tab === "shop" ? <InventoryPanel /> : null}
        </section>
      ) : null}

      <main className="game__field">
        {settings.hints && !tab ? <p className="game__hint">{t("hintGame")}</p> : null}
        <div className="game__mine">
          <MineField />
        </div>
      </main>

      <div className="game__bottom">
        <ResourceStub />
      </div>
    </div>
  );
}
