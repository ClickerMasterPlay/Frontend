import { useState } from "react";
import { GearButton } from "../components/GearButton";
import { McButton } from "../components/McButton";
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

function tabFromHash(): GameTab {
  const hash = window.location.hash.replace("#", "");
  if (hash === "rating" || hash === "quests" || hash === "shop") {
    return hash;
  }
  return "shop";
}

export function GameScreen({ onSettings, onProfile }: GameScreenProps) {
  const { t, settings } = useSettings();
  const { coins } = useWallet();
  const [tab, setTab] = useState<GameTab>(tabFromHash);

  return (
    <div className="title-screen game">
      <div className="title-screen__dirt" />
      <div className="title-screen__shade title-screen__shade--game" />

      <div className="game__top">
        <GearButton label={t("settings")} onClick={onSettings} />
        <McButton slim onClick={onProfile}>
          {t("profile")}
        </McButton>
        {settings.hints ? <p className="game__hint">{t("hintGame")}</p> : null}
        <p className="game__coins">
          <span className="game__coin-icon" aria-hidden="true" />
          <span>
            {t("coins")} · {coins}
          </span>
        </p>
      </div>

      <section className="game__panel">
        <div className="game__tabs" role="tablist">
          <McButton slim active={tab === "shop"} onClick={() => setTab("shop")}>
            {t("shop")}
          </McButton>
          <McButton slim active={tab === "rating"} onClick={() => setTab("rating")}>
            {t("rating")}
          </McButton>
          <McButton slim active={tab === "quests"} onClick={() => setTab("quests")}>
            {t("quests")}
          </McButton>
        </div>

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

      </section>

      <InventoryPanel />

      <main className="game__field">
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
