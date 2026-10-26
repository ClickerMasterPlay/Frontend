import type { UpgradeId } from "../game/upgrades";
import "./PixelIcon.css";

const SRC: Record<UpgradeId, string> = {
  wood: "/shop/wood.png",
  iron: "/shop/iron.png",
  gold: "/shop/gold.png",
  click: "/shop/click.png",
  auto: "/shop/auto.png",
};

type PixelIconProps = {
  kind: UpgradeId;
  label?: string;
};

export function PixelIcon({ kind, label }: PixelIconProps) {
  return (
    <img
      className="px-icon"
      src={SRC[kind]}
      alt={label ?? ""}
      draggable={false}
    />
  );
}
