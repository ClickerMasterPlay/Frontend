import { useState } from "react";
import { itemView } from "../game/items";
import { useSettings } from "../settings/SettingsContext";
import { useWallet } from "../wallet/WalletContext";
import "./InventoryPanel.css";

const SLOT_COUNT = 7;

export function InventoryPanel() {
  const { t } = useSettings();
  const { resources, owned, stones, equippedToolCode } = useWallet();
  const [picked, setPicked] = useState<number | null>(null);

  const filled = [
    ...Object.entries(resources).map(([code, count]) => ({
      code,
      count,
      mark: itemView(code).mark,
      label: t(itemView(code).key),
    })),
    ...owned
      .filter((code) => code !== "click_power_1")
      .map((code) => ({
        code,
        count: 1,
        mark: itemView(code).mark,
        label: t(itemView(code).key),
      })),
  ];

  if (equippedToolCode && !filled.some((slot) => slot.code === equippedToolCode)) {
    filled.unshift({
      code: equippedToolCode,
      count: 1,
      mark: itemView(equippedToolCode).mark,
      label: t(itemView(equippedToolCode).key),
    });
  }

  if (stones > 0 && !filled.some((slot) => slot.code === "credits")) {
    filled.unshift({
      code: "credits",
      count: stones,
      mark: itemView("credits").mark,
      label: t("invStone"),
    });
  }

  const slots = Array.from({ length: SLOT_COUNT }, (_, index) => filled[index] ?? null);

  return (
    <aside className="inv-panel" aria-label={t("inventory")}>
      <p className="inv-panel__title">{t("inventory")}</p>
      <div className="inv-panel__grid">
        {slots.map((slot, index) => {
          const label = slot ? `${slot.label} ×${slot.count}` : t("inventoryStub");
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
              {slot ? <span>{slot.mark}</span> : null}
              {slot && slot.count > 0 ? <b>{slot.count}</b> : null}
            </button>
          );
        })}
      </div>
      <p className="inv-panel__pick">
        {picked === null
          ? ""
          : slots[picked]
            ? `${slots[picked]?.label} ×${slots[picked]?.count}`
            : t("inventoryStub")}
      </p>
    </aside>
  );
}
