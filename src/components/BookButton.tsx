import "./GearButton.css";

type BookButtonProps = {
  label: string;
  active?: boolean;
  onClick: () => void;
};

export function BookButton({ label, active = false, onClick }: BookButtonProps) {
  return (
    <button
      type="button"
      className={active ? "gear-btn gear-btn--on" : "gear-btn"}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      <svg
        className="gear-btn__icon"
        viewBox="0 0 16 16"
        width="18"
        height="18"
        shapeRendering="crispEdges"
        aria-hidden="true"
      >
        <rect x="2" y="2" width="12" height="12" fill="#6b4a22" />
        <rect x="3" y="3" width="5" height="10" fill="#d8c48a" />
        <rect x="8" y="3" width="5" height="10" fill="#c4ae72" />
        <rect x="7" y="3" width="2" height="10" fill="#5a3a1c" />
        <rect x="4" y="5" width="3" height="1" fill="#8a6234" />
        <rect x="4" y="7" width="3" height="1" fill="#8a6234" />
        <rect x="10" y="5" width="2" height="1" fill="#8a6234" />
      </svg>
    </button>
  );
}
