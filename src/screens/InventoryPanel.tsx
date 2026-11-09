import { useState } from "react";
import { PixelIcon } from "../components/PixelIcon";
import { isUpgradeId, upgradeTitleKey, type UpgradeId } from "../game/upgrades";
import { useSettings } from "../settings/SettingsContext";
import { useWallet } from "../wallet/WalletContext";
import "./InventoryPanel.css";

const SIDE_SLOTS = 5;

type InventoryPanelProps = {
  /** Side strip in shop vs full grid in modal. */
  layout?: "side" | "full";
  /** Allow on/off toggle for owned upgrades. */
  interactive?: boolean;
};

export function InventoryPanel({
  layout = "side",
  interactive = false,
}: InventoryPanelProps) {
  const { t } = useSettings();
  const { owned, active, toggleActive } = useWallet();
  const [picked, setPicked] = useState<number | null>(null);

  const filled = owned.map((code) => {
    const upgrade = isUpgradeId(code) ? code : null;
    return {
      code,
      mark: upgrade ? "" : code.slice(0, 2).toUpperCase(),
      label: upgrade ? t(upgradeTitleKey(upgrade)) : code,
      upgrade: upgrade as UpgradeId | null,
      on: active.includes(code),
    };
  });

  const slots =
    layout === "full"
      ? filled
      : Array.from({ length: Math.max(SIDE_SLOTS, filled.length) }, (_, index) => filled[index] ?? null);

  return (
    <aside
      className={layout === "full" ? "inv-panel inv-panel--full" : "inv-panel"}
      aria-label={t("inventory")}
    >
      {layout === "side" ? <p className="inv-panel__title">{t("inventory")}</p> : null}
      <div className={layout === "full" ? "inv-panel__grid inv-panel__grid--full" : "inv-panel__grid"}>
        {slots.map((slot, index) => {
          if (!slot) {
            return (
              <button
                key={`empty-${index}`}
                type="button"
                className="inv-panel__slot"
                title={t("inventoryStub")}
                onClick={() => setPicked(index)}
              />
            );
          }
          const label = slot.on ? `${slot.label} · ${t("activeOn")}` : `${slot.label} · ${t("activeOff")}`;
          const selected = picked === index || (interactive && slot.on);
          return (
            <button
              key={slot.code}
              type="button"
              className={selected ? "inv-panel__slot inv-panel__slot--on" : "inv-panel__slot"}
              title={label}
              aria-pressed={interactive ? slot.on : undefined}
              onClick={() => {
                setPicked(index);
                if (interactive && slot.upgrade) {
                  toggleActive(slot.code);
                }
              }}
            >
              {slot.upgrade ? <PixelIcon kind={slot.upgrade} /> : <span>{slot.mark}</span>}
            </button>
          );
        })}
      </div>
      <p className="inv-panel__pick">
        {picked === null ? "" : slots[picked] ? slots[picked]?.label : t("inventoryStub")}
      </p>
    </aside>
  );
}
