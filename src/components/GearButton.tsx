import "./GearButton.css";

type GearButtonProps = {
  label: string;
  onClick: () => void;
};

export function GearButton({ label, onClick }: GearButtonProps) {
  return (
    <button type="button" className="gear-btn" onClick={onClick} aria-label={label} title={label}>
      <svg
        className="gear-btn__icon"
        viewBox="0 0 16 16"
        width="18"
        height="18"
        shapeRendering="crispEdges"
        aria-hidden="true"
      >
        <rect x="6" y="1" width="4" height="2" fill="#3d2a12" />
        <rect x="6" y="13" width="4" height="2" fill="#3d2a12" />
        <rect x="1" y="6" width="2" height="4" fill="#3d2a12" />
        <rect x="13" y="6" width="2" height="4" fill="#3d2a12" />
        <rect x="3" y="3" width="2" height="2" fill="#3d2a12" />
        <rect x="11" y="3" width="2" height="2" fill="#3d2a12" />
        <rect x="3" y="11" width="2" height="2" fill="#3d2a12" />
        <rect x="11" y="11" width="2" height="2" fill="#3d2a12" />
        <rect x="4" y="4" width="8" height="8" fill="#3d2a12" />
        <rect x="6" y="6" width="4" height="4" fill="#f6d56a" />
      </svg>
    </button>
  );
}
