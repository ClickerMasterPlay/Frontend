import "./McButton.css";

type McButtonProps = {
  children: string;
  disabled?: boolean;
  wide?: boolean;
  slim?: boolean;
  active?: boolean;
  onClick?: () => void;
};

export function McButton({
  children,
  disabled = false,
  wide = false,
  slim = false,
  active = false,
  onClick,
}: McButtonProps) {
  const className = [
    "mc-btn",
    wide ? "mc-btn--wide" : "",
    slim ? "mc-btn--slim" : "",
    disabled ? "mc-btn--off" : "",
    active ? "mc-btn--on" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={className}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      onClick={disabled ? undefined : onClick}
      onKeyDown={(event) => {
        if (disabled) {
          return;
        }
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick?.();
        }
      }}
    >
      <span className="mc-btn__label">{children}</span>
    </div>
  );
}
