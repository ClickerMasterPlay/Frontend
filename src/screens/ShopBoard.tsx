import { McButton } from "../components/McButton";
import { useSettings } from "../settings/SettingsContext";
import { SHOP_ITEMS, type ShopItemId } from "../wallet/wallet";
import { useWallet } from "../wallet/WalletContext";
import "./ShopModal.css";

const TITLES: Record<ShopItemId, "shopClick" | "shopPick" | "shopMachine"> = {
  click: "shopClick",
  pick: "shopPick",
  machine: "shopMachine",
};

export function ShopBoard() {
  const { t } = useSettings();
  const { coins, owned, buy } = useWallet();

  return (
    <div className="shop shop--panel">
      <div className="shop__grid">
        {SHOP_ITEMS.map((item) => {
          const isOwned = owned.includes(item.id);
          return (
            <article key={item.id} className="shop__card">
              <p className="shop__name">{t(TITLES[item.id])}</p>
              <p className="shop__price">
                {t("shopPrice")}: {item.price}
              </p>
              <McButton
                slim
                disabled={isOwned || coins < item.price}
                onClick={() => {
                  buy(item.id);
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
