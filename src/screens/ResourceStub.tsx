import { useState } from "react";
import { McModal } from "../components/McModal";
import { PixelIcon } from "../components/PixelIcon";
import { isUpgradeId, upgradeTitleKey } from "../game/upgrades";
import { useSettings } from "../settings/SettingsContext";
import { useWallet } from "../wallet/WalletContext";
import { InventoryPanel } from "./InventoryPanel";
import "./ResourceStub.css";

const HOTBAR_SLOTS = 4;

export function ResourceStub() {
  const { t } = useSettings();
  const { owned, active, toggleActive } = useWallet();
  const [inventoryOpen, setInventoryOpen] = useState(false);

  const hotbar = Array.from({ length: HOTBAR_SLOTS }, (_, index) => owned[index] ?? null);

  return (
    <section className="res-stub" aria-label={t("quickAccess")}>
      <div className="res-stub__row">
        {hotbar.map((productId, index) => {
          if (!productId) {
            return <div key={`empty-${index}`} className="res-stub__slot res-stub__slot--empty" />;
          }
          const upgrade = isUpgradeId(productId) ? productId : null;
          const label = upgrade ? t(upgradeTitleKey(upgrade)) : productId;
          const on = active.includes(productId);
          return (
            <button
              key={productId}
              type="button"
              className={on ? "res-stub__slot res-stub__slot--on" : "res-stub__slot"}
              title={on ? `${label} · ${t("activeOn")}` : `${label} · ${t("activeOff")}`}
              aria-pressed={on}
              onClick={() => toggleActive(productId)}
            >
              {upgrade ? <PixelIcon kind={upgrade} /> : <span>{productId.slice(0, 2)}</span>}
            </button>
          );
        })}
        <button
          type="button"
          className="res-stub__slot res-stub__burger"
          title={t("inventory")}
          aria-label={t("inventory")}
          onClick={() => setInventoryOpen(true)}
        >
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <p className="res-stub__note">
        {owned.length === 0 ? t("quickAccessEmpty") : t("quickAccessHint")}
      </p>
      {inventoryOpen ? (
        <McModal title={t("inventory")} closeLabel={t("close")} wide onClose={() => setInventoryOpen(false)}>
          <InventoryPanel layout="full" interactive />
        </McModal>
      ) : null}
    </section>
  );
}
