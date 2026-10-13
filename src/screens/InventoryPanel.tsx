import { useState } from "react";
import { useSettings } from "../settings/SettingsContext";
import type { MessageKey } from "../i18n/strings";
import "./InventoryPanel.css";

const SLOTS: Array<{ key: MessageKey | null; count: number; mark: string }> = [
  { key: "invStone", count: 12, mark: "К" },
  { key: "invWood", count: 7, mark: "Д" },
  { key: "invCoin", count: 3, mark: "М" },
  { key: "invPickItem", count: 1, mark: "Ки" },
  { key: null, count: 0, mark: "" },
  { key: null, count: 0, mark: "" },
  { key: null, count: 0, mark: "" },
];

export function InventoryPanel() {
  const { t } = useSettings();
  const [picked, setPicked] = useState<number | null>(null);

  return (
    <aside className="inv-panel" aria-label={t("inventory")}>
      <p className="inv-panel__title">{t("inventory")}</p>
      <div className="inv-panel__grid">
        {SLOTS.map((slot, index) => {
          const label = slot.key ? `${t(slot.key)} ×${slot.count}` : t("inventoryStub");
          return (
            <button
              key={index}
              type="button"
              className={
                picked === index ? "inv-panel__slot inv-panel__slot--on" : "inv-panel__slot"
              }
              title={label}
              onClick={() => setPicked(index)}
            >
              {slot.mark ? <span>{slot.mark}</span> : null}
              {slot.count > 0 ? <b>{slot.count}</b> : null}
            </button>
          );
        })}
      </div>
      <p className="inv-panel__pick">
        {picked === null
          ? ""
          : SLOTS[picked].key
            ? `${t(SLOTS[picked].key)} ×${SLOTS[picked].count}`
            : t("inventoryStub")}
      </p>
    </aside>
  );
}
