import { itemView } from "../game/items";
import { useSettings } from "../settings/SettingsContext";
import { catalogTitleKey } from "../wallet/wallet";
import { useWallet } from "../wallet/WalletContext";
import "./ResourceStub.css";

export function ResourceStub() {
  const { t } = useSettings();
  const { owned, active, toggleActive } = useWallet();

  return (
    <section className="res-stub" aria-label={t("quickAccess")}>
      <p className="res-stub__title">{t("quickAccess")}</p>
      <div className="res-stub__row">
        {owned.length === 0 ? (
          <p className="res-stub__note">{t("quickAccessEmpty")}</p>
        ) : (
          owned.map((productId) => {
            const titleKey = catalogTitleKey(productId);
            const label = titleKey ? t(titleKey) : t(itemView(productId).key);
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
                <span>{itemView(productId).mark}</span>
              </button>
            );
          })
        )}
      </div>
      {owned.length > 0 ? <p className="res-stub__note">{t("quickAccessHint")}</p> : null}
    </section>
  );
}
