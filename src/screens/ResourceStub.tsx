import { PixelIcon } from "../components/PixelIcon";
import { isUpgradeId, upgradeTitleKey } from "../game/upgrades";
import { useSettings } from "../settings/SettingsContext";
import { useWallet } from "../wallet/WalletContext";
import "./ResourceStub.css";

export function ResourceStub() {
  const { t } = useSettings();
  const { owned, active, toggleActive } = useWallet();

  return (
    <section className="res-stub" aria-label={t("quickAccess")}>
      {owned.length > 0 ? (
        <div className="res-stub__row">
          {owned.map((productId) => {
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
        </div>
      ) : null}
      <p className="res-stub__note">{owned.length === 0 ? t("quickAccessEmpty") : t("quickAccessHint")}</p>
    </section>
  );
}
