import { McButton } from "../components/McButton";
import { useSettings } from "../settings/SettingsContext";
import { catalogTitleKey } from "../wallet/wallet";
import { useWallet } from "../wallet/WalletContext";
import "./ShopModal.css";

export function ShopBoard() {
  const { t } = useSettings();
  const { stones, owned, catalog, buy, lastError } = useWallet();

  return (
    <div className="shop shop--panel">
      {lastError ? <p className="shop__balance">{lastError}</p> : null}
      <div className="shop__grid">
        {catalog.map((item) => {
          const titleKey = catalogTitleKey(item.productId);
          const isOwned = item.productType !== "CLICK_UPGRADE" && owned.includes(item.productId);
          return (
            <article key={`${item.productType}:${item.productId}`} className="shop__card">
              <div className="shop__info">
                <p className="shop__name">{titleKey ? t(titleKey) : item.productId}</p>
                {item.effect ? <p className="shop__effect">{item.effect}</p> : null}
              </div>
              <p className="shop__price">
                {t("shopPrice")}: {item.price} {t("stonesShort")}
              </p>
              <McButton
                slim
                disabled={isOwned || stones < item.price}
                onClick={() => {
                  void buy(item);
                }}
              >
                {isOwned ? t("shopOwned") : t("shopBuy")}
              </McButton>
            </article>
          );
        })}
      </div>
    </div>
  );
}
