import { PixelIcon } from "../components/PixelIcon";
import { McButton } from "../components/McButton";
import { formatStones } from "../game/levels";
import {
  UPGRADE_IDS,
  formatPrice,
  isPickaxe,
  nextPrice,
  tierValue,
  upgradeMaxLevel,
  upgradeTitleKey,
  type UpgradeId,
} from "../game/upgrades";
import { useSettings } from "../settings/SettingsContext";
import { useWallet } from "../wallet/WalletContext";
import "./ShopModal.css";

function effectText(
  id: UpgradeId,
  level: number,
  comma: boolean,
  coeff: string,
  toClick: string,
  perHour: string,
): string {
  const value = formatStones(tierValue(id, level), comma);
  if (id === "click") {
    return `+${value} ${toClick}`;
  }
  if (id === "auto") {
    return `+${value} ${perHour}`;
  }
  return `${coeff} ×${value}`;
}

export function ShopBoard() {
  const { t, settings } = useSettings();
  const { stones, upgrades, buyUpgrade } = useWallet();
  const comma = settings.language === "ru";

  return (
    <div className="shop shop--panel">
      <div className="shop__grid">
        {UPGRADE_IDS.map((id) => {
          const level = upgrades[id];
          const maxLevel = upgradeMaxLevel(id);
          const price = nextPrice(id, level);
          const pickaxe = isPickaxe(id);
          const ownedPickaxe = pickaxe && level > 0;
          const current =
            level > 0
              ? effectText(id, level, comma, t("shopCoeff"), t("shopToClick"), t("shopPerHour"))
              : null;
          const upcoming =
            !ownedPickaxe && price !== null
              ? effectText(id, level + 1, comma, t("shopCoeff"), t("shopToClick"), t("shopPerHour"))
              : null;
          const statusLabel = ownedPickaxe
            ? t("shopOwned")
            : price === null
              ? t("shopMax")
              : `${t("shopPrice")}: ${formatPrice(price)} ${t("stonesShort")}`;
          const buttonLabel = ownedPickaxe
            ? t("shopOwned")
            : price === null
              ? t("shopMax")
              : level === 0
                ? t("shopBuy")
                : t("shopUpgrade");

          return (
            <article
              key={id}
              className={ownedPickaxe ? "shop__card shop__card--owned" : "shop__card"}
            >
              <p className="shop__name">{t(upgradeTitleKey(id))}</p>
              <div className="shop__head">
                <PixelIcon kind={id} label={t(upgradeTitleKey(id))} />
                <div className="shop__info">
                  {!pickaxe ? (
                    <p className="shop__stars" aria-label={`${t("shopStars")}: ${level}/${maxLevel}`}>
                      {Array.from({ length: maxLevel }, (_, star) => (
                        <svg
                          key={star}
                          className={star < level ? "shop__star shop__star--on" : "shop__star"}
                          viewBox="0 0 12 12"
                          aria-hidden="true"
                        >
                          <path d="M6 1.1 7.4 4.3 10.9 4.7 8.3 7.1 9.1 10.6 6 8.8 2.9 10.6 3.7 7.1 1.1 4.7 4.6 4.3Z" />
                        </svg>
                      ))}
                    </p>
                  ) : null}
                  {current ? (
                    <p className="shop__effect">
                      {pickaxe ? current : `${t("shopNow")}: ${current}`}
                    </p>
                  ) : upcoming && level === 0 ? (
                    <p className="shop__effect">{upcoming}</p>
                  ) : null}
                  {upcoming && level > 0 ? (
                    <p className="shop__effect">
                      {t("shopNext")}: {upcoming}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="shop__buy">
                <p className={ownedPickaxe ? "shop__price shop__price--owned" : "shop__price"}>
                  {statusLabel}
                </p>
                <McButton
                  slim
                  disabled={ownedPickaxe || price === null || stones < (price ?? 0)}
                  onClick={() => {
                    void buyUpgrade(id);
                  }}
                >
                  {buttonLabel}
                </McButton>
              </div>
            </article>
          );
        })}
      </div>
      <p className="shop__note">{t("shopPowerHint")}</p>
    </div>
  );
}
