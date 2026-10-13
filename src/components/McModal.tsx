import { useEffect, type ReactNode } from "react";
import { McButton } from "./McButton";
import "./McModal.css";

type McModalProps = {
  title: string;
  closeLabel: string;
  wide?: boolean;
  onClose: () => void;
  children: ReactNode;
};

export function McModal({
  title,
  closeLabel,
  wide = false,
  onClose,
  children,
}: McModalProps) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="mc-modal" role="presentation" onClick={onClose}>
      <div
        className={wide ? "mc-modal__box mc-modal__box--wide" : "mc-modal__box"}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <p className="mc-modal__title">{title}</p>
        <div className="mc-modal__body">{children}</div>
        <McButton wide onClick={onClose}>
          {closeLabel}
        </McButton>
      </div>
    </div>
  );
}
