import { useState } from "react";
import { formatStones } from "../game/levels";
import { itemView } from "../game/items";
import { PixelIcon } from "../components/PixelIcon";
import { isUpgradeId, upgradeTitleKey, type UpgradeId } from "../game/upgrades";
import { useSettings } from "../settings/SettingsContext";
import { useWallet } from "../wallet/WalletContext";
import "./InventoryPanel.css";

const SLOT_COUNT = 5;

export function InventoryPanel() {
  const { t, settings } = useSettings();
  const { resources, owned, upgrades } = useWallet();
  const [picked, setPicked] = useState<number | null>(null);

  const filled = [
    ...Object.entries(resources).map(([code, count]) => ({
      code,
      count,
      mark: itemView(code).mark,
      label: t(itemView(code).key),
      upgrade: null as UpgradeId | null,
    })),
    ...owned.map((code) => {
      const upgrade = isUpgradeId(code) ? code : null;
      return {
        code,
        count: upgrade ? upgrades[upgrade] : 1,
        mark: upgrade ? "" : itemView(code).mark,
        label: upgrade ? t(upgradeTitleKey(upgrade)) : t(itemView(code).key),
        upgrade,
      };
    }),
  ];

  const slots = Array.from({ length: SLOT_COUNT }, (_, index) => filled[index] ?? null);

  return (
    <aside className="inv-panel" aria-label={t("inventory")}>
      <p className="inv-panel__title">{t("inventory")}</p>
      <div className="inv-panel__grid">
        {slots.map((slot, index) => {
          const label = slot
            ? `${slot.label} ×${formatStones(slot.count, settings.language === "ru")}`
            : t("inventoryStub");
          return (
            <button
              key={slot?.code ?? `empty-${index}`}
              type="button"
              className={
                picked === index ? "inv-panel__slot inv-panel__slot--on" : "inv-panel__slot"
              }
              title={label}
              onClick={() => setPicked(index)}
            >
              {slot?.upgrade ? <PixelIcon kind={slot.upgrade} /> : slot ? <span>{slot.mark}</span> : null}
              {slot && slot.count > 0 ? (
                <b>{formatStones(slot.count, settings.language === "ru")}</b>
              ) : null}
            </button>
          );
        })}
      </div>
      <p className="inv-panel__pick">
        {picked === null
          ? ""
          : slots[picked]
            ? `${slots[picked]?.label} ×${formatStones(slots[picked]?.count ?? 0, settings.language === "ru")}`
            : t("inventoryStub")}
      </p>
    </aside>
  );
}
