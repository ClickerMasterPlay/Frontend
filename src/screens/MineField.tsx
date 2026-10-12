import { useState } from "react";
import { useSettings } from "../settings/SettingsContext";
import { useWallet } from "../wallet/WalletContext";
import "./MineField.css";

const BASE_HP = 6;
const BASE_REWARD = 1;

function nextHp() {
  return BASE_HP + Math.floor(Math.random() * 3);
}

export function MineField() {
  const { t } = useSettings();
  const { owned, rewardMine } = useWallet();
  const [hp, setHp] = useState(BASE_HP);
  const [maxHp, setMaxHp] = useState(BASE_HP);
  const [hit, setHit] = useState(false);

  const damage = 1 + (owned.includes("click") ? 1 : 0) + (owned.includes("pick") ? 1 : 0);

  const onMine = () => {
    setHit(true);
    window.setTimeout(() => setHit(false), 120);
    const next = hp - damage;
    if (next <= 0) {
      const fresh = nextHp();
      setHp(fresh);
      setMaxHp(fresh);
      rewardMine(BASE_REWARD + (owned.includes("machine") ? 1 : 0));
      return;
    }
    setHp(next);
  };

  return (
    <div className="mine">
      <button
        type="button"
        className={hit ? "mine__block mine__block--hit" : "mine__block"}
        onClick={onMine}
      >
        <span className="mine__stone" />
      </button>
      <div className="mine__bar" aria-label={t("blockHp")}>
        <span style={{ width: `${Math.max(0, (hp / maxHp) * 100)}%` }} />
      </div>
      <p className="mine__hp">
        {t("blockHp").replace("--", `${hp}/${maxHp}`)}
      </p>
    </div>
  );
}
