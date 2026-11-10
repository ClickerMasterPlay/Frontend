import "./ResourceIcon.css";

type ResourceKind = "stone" | "diamond";

const SRC: Record<ResourceKind, string> = {
  stone: "/icons/stone.png",
  diamond: "/icons/diamond.png",
};

type ResourceIconProps = {
  kind: ResourceKind;
  size?: number;
};

export function ResourceIcon({ kind, size = 22 }: ResourceIconProps) {
  return (
    <img
      className="res-icon"
      src={SRC[kind]}
      alt=""
      width={size}
      height={size}
      draggable={false}
    />
  );
}
